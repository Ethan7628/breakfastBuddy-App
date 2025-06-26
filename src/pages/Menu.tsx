import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { addToUserCart, getUserCart } from '@/lib/firebase';
import '../styles/Menu.css';

interface MealItem {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  popular?: boolean;
}

interface CartItem {
  id: string;
  quantity: number;
  name: string;
  price: number;
}

const fetchBreakfastMeals = async (): Promise<MenuItem[]> => {
  const meals: MenuItem[] = [];

  for (let i = 0; i < 12; i++) {
    const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    const data = await response.json();
    const meal: MealItem = data.meals[0];

    const menuItem: MenuItem = {
      id: meal.idMeal,
      name: meal.strMeal,
      description: meal.strInstructions.substring(0, 100) + '...',
      price: Math.random() * 15 + 5,
      category: 'Breakfast Special',
      image: meal.strMealThumb,
      popular: Math.random() > 0.7
    };

    meals.push(menuItem);
  }

  return meals;
};

const categories = ['All', 'Breakfast Special', 'Popular'];

const Menu = () => {
  const { currentUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['breakfast-meals'],
    queryFn: fetchBreakfastMeals,
  });

  // Load user's cart from Firestore
  useEffect(() => {
    const loadCart = async () => {
      if (currentUser?.uid) {
        try {
          const cartItems = await getUserCart(currentUser.uid);
          const cartMap: Record<string, number> = {};
          (cartItems as { id: string; quantity: number }[]).forEach(item => {
            cartMap[item.id] = (cartMap[item.id] || 0) + item.quantity;
          });
          setCart(cartMap);
        } catch (err) {
          console.error('Error loading cart:', err);
        }
      }
    };
    loadCart();
  }, [currentUser]);

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : selectedCategory === 'Popular'
      ? menuItems.filter(item => item.popular)
      : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = async (itemId: string) => {
    if (!currentUser) {
      toast({ title: 'Please login to add items' });
      return;
    }

    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      // Update cart in Firestore
      await addToUserCart(
        currentUser.uid,
        itemId,
        {
          id: itemId,
          name: item.name,
          price: item.price,
          quantity: 1
        } as CartItem
      );

      // Update local state
      setCart(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }));

      toast({ title: 'Added to cart!' });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Failed to add to cart',
        variant: 'destructive'
      });
    }
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((total, [itemId, count]) => {
      const item = menuItems.find(i => i.id === itemId);
      return total + (item ? item.price * count : 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600 mx-auto"></div>
          <p className="mt-4 text-breakfast-700">Loading delicious breakfast options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-red-600">
          <p>Sorry, we couldn't load the menu right now. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-root">
      <div className="menu-title">
        <h1>Breakfast Menu</h1>
        <p>Delicious breakfast options to start your day right</p>
      </div>

      {/* Category Filter */}
      <div className="menu-category-filter">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "breakfast-gradient text-white" : ""}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Cart Summary */}
      {getTotalItems() > 0 && (
        <Card className="menu-cart-summary">
          <CardContent className="menu-cart-content">
            <div className="menu-cart-row">
              <div>
                <span className="menu-cart-label">
                  Cart: {getTotalItems()} items
                </span>
                <span className="menu-cart-total">
                  Total: ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              <Button className="breakfast-gradient text-white">
                Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="menu-items-grid">
        {filteredItems.map((item) => (
          <Card key={item.id} className="menu-item-card">
            <CardHeader>
              <div className="menu-item-header">
                <div className="menu-item-img-wrap">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="menu-item-img"
                  />
                </div>
                {item.popular && (
                  <span className="menu-item-popular">Popular</span>
                )}
              </div>
              <CardTitle className="menu-item-title">{item.name}</CardTitle>
              <p className="menu-item-desc">{item.description}</p>
            </CardHeader>
            <CardContent>
              <div className="menu-item-content">
                <span className="menu-item-price">
                  ${item.price.toFixed(2)}
                </span>
                <div className="menu-item-actions">
                  {cart[item.id] > 0 && (
                    <span className="menu-item-incart">
                      {cart[item.id]} in cart
                    </span>
                  )}
                  <Button
                    onClick={() => addToCart(item.id)}
                    size="sm"
                    className="breakfast-gradient text-white"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Menu;

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { addToUserCart, getUserCart, CartItem } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const { currentUser, userData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['breakfast-meals'],
    queryFn: fetchBreakfastMeals,
  });

  // Load user's cart from Firestore
  useEffect(() => {
    const loadCart = async () => {
      if (currentUser?.uid) {
        try {
          console.log('Loading cart for user:', currentUser.uid);
          const cartItems: CartItem[] = await getUserCart(currentUser.uid);
          console.log('Loaded cart items:', cartItems);

          const cartMap: Record<string, number> = {};
          cartItems.forEach((item) => {
            cartMap[item.itemId] = (cartMap[item.itemId] || 0) + (item.quantity || 1);
          });
          setCart(cartMap);
        } catch (err) {
          console.error('Error loading cart:', err);
          toast({
            title: 'Error loading cart',
            description: 'Please refresh the page',
            variant: 'destructive'
          });
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
      toast({
        title: 'Please login to add items',
        description: 'You need to be logged in to add items to cart'
      });
      return;
    }

    const item = menuItems.find(i => i.id === itemId);
    if (!item) {
      toast({
        title: 'Item not found',
        variant: 'destructive'
      });
      return;
    }

    setIsAddingToCart(itemId);

    try {
      console.log('Adding item to cart:', item);

      await addToUserCart(
        currentUser.uid,
        itemId,
        {
          name: item.name,
          price: item.price
        }
      );

      // Update local state
      setCart(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }));

      toast({
        title: 'Added to cart!',
        description: `${item.name} has been added to your cart`
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Failed to add to cart',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsAddingToCart(null);
    }
  };

  const handleCheckout = async () => {
    if (!currentUser || Object.keys(cart).length === 0) return;

    setIsCheckingOut(true);

    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          itemId,
          name: item?.name || 'Unknown Item',
          price: item?.price || 0,
          quantity,
          total: (item?.price || 0) * quantity
        };
      });

      const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);

      // Create order in Firestore
      await addDoc(collection(db, 'orders'), {
        userId: currentUser.uid,
        userEmail: userData?.email || currentUser.email,
        userName: userData?.name || 'Unknown User',
        items: orderItems,
        totalAmount,
        status: 'pending',
        deliveryLocation: userData?.selectedBlock || 'Not specified',
        createdAt: new Date().toISOString()
      });

      // Clear cart
      setCart({});

      toast({
        title: 'Order placed successfully!',
        description: `Your order of $${totalAmount.toFixed(2)} has been submitted for delivery to ${userData?.selectedBlock || 'your location'}.`
      });

    } catch (error) {
      console.error('Error processing checkout:', error);
      toast({
        title: 'Checkout failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingOut(false);
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
        <h1 className="text-breakfast-800">Breakfast Menu</h1>
        <p className="text-breakfast-600">Delicious breakfast options to start your day right</p>
      </div>

      {/* Category Filter */}
      <div className="menu-category-filter">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "breakfast-gradient text-white" : "text-breakfast-700 border-breakfast-300"}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Cart Summary */}
      {getTotalItems() > 0 && (
        <Card className="menu-cart-summary border-breakfast-200">
          <CardContent className="menu-cart-content">
            <div className="menu-cart-row">
              <div>
                <span className="menu-cart-label text-breakfast-700">
                  Cart: {getTotalItems()} items
                </span>
                <span className="menu-cart-total text-breakfast-800 font-bold">
                  Total: ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              <Button
                className="breakfast-gradient text-white"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="menu-items-grid">
        {filteredItems.map((item) => (
          <Card key={item.id} className="menu-item-card border-breakfast-200">
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
                  <span className="menu-item-popular bg-breakfast-500 text-white">Popular</span>
                )}
              </div>
              <CardTitle className="menu-item-title text-breakfast-800">{item.name}</CardTitle>
              <p className="menu-item-desc text-breakfast-600">{item.description}</p>
            </CardHeader>
            <CardContent>
              <div className="menu-item-content">
                <span className="menu-item-price text-breakfast-800 font-bold">
                  ${item.price.toFixed(2)}
                </span>
                <div className="menu-item-actions">
                  {cart[item.id] > 0 && (
                    <span className="menu-item-incart text-breakfast-600">
                      {cart[item.id]} in cart
                    </span>
                  )}
                  <Button
                    onClick={() => addToCart(item.id)}
                    size="sm"
                    className="breakfast-gradient text-white"
                    disabled={isAddingToCart === item.id}
                  >
                    {isAddingToCart === item.id ? 'Adding...' : 'Add to Cart'}
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

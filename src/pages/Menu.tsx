
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { addToUserCart, getUserCart, CartItem } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
  // Parallel API calls for much faster loading
  const fetchPromises = Array.from({ length: 15 }, () => 
    fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json())
  );

  const responses = await Promise.all(fetchPromises);
  
  return responses.map((data, index) => {
    const meal: MealItem = data.meals[0];
    return {
      id: meal.idMeal,
      name: meal.strMeal,
      description: meal.strInstructions.substring(0, 100) + '...',
      price: Math.floor(Math.random() * 40000) + 10000,
      category: 'Breakfast Special',
      image: meal.strMealThumb,
      popular: Math.random() > 0.7
    };
  });
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
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

  const clearUserCart = async () => {
    if (!currentUser?.uid) return;

    try {
      // Get all cart items for this user
      const cartQuery = query(
        collection(db, 'userCarts'),
        where('userId', '==', currentUser.uid)
      );
      const cartSnapshot = await getDocs(cartQuery);

      // Delete all cart items
      const deletePromises = cartSnapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db, 'userCarts', docSnapshot.id))
      );

      await Promise.all(deletePromises);
      console.log('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const handleCheckout = async () => {
    if (!currentUser || Object.keys(cart).length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive'
      });
      return;
    }

    if (!userData?.selectedBlock) {
      toast({
        title: 'Delivery location required',
        description: 'Please set your delivery location in Settings first',
        variant: 'destructive'
      });
      return;
    }

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

      // Clear cart from Firestore
      await clearUserCart();

      // Clear local cart state
      setCart({});

      toast({
        title: 'Order placed successfully!',
        description: `Your order of UGX ${totalAmount.toLocaleString()} has been submitted for delivery to ${userData?.selectedBlock || 'your location'}.`
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
      <div className="menu-root">
        <div className="menu-title">
          <h1 className="text-breakfast-800">Breakfast Menu</h1>
          <p className="text-breakfast-600">Loading delicious breakfast options...</p>
        </div>
        
        <div className="menu-category-filter">
          {categories.map((category) => (
            <div key={category} className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        
        <div className="menu-items-grid">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded"></div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="flex justify-between items-center mt-4">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
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
                  Total: UGX {getTotalPrice().toLocaleString()}
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
                    loading="lazy"
                    decoding="async"
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
                  UGX {item.price.toLocaleString()}
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


import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { PaymentDialog } from '@/components/PaymentDialog';
import { playNotificationSound } from '@/utils/soundNotification';
import { supabase } from '@/integrations/supabase/client';
import '../styles/Menu.css';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  popular?: boolean;
  preparationTime?: string;
  ingredients?: string;
}

const fetchBreakfastMeals = async (): Promise<MenuItem[]> => {
  console.log('Fetching menu items from Supabase');
  
  // Fetch menu items from Supabase (server-side authoritative prices)
  const { data: menuItems, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching menu items from Supabase:', error);
    throw new Error('Failed to load menu items');
  }

  if (!menuItems || menuItems.length === 0) {
    console.log('No menu items in database, returning empty array');
    return [];
  }

  // Map Supabase data to MenuItem format
  return menuItems.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    category: item.category || 'Breakfast Special',
    image: item.image_url || '',
    popular: item.popular || false,
    preparationTime: item.preparation_time || '',
    ingredients: item.ingredients || ''
  }));
};

const categories = ['All', 'Breakfast Special', 'Popular', 'Lunch', 'Snacks', 'Beverages', 'Desserts'];

const Menu = () => {
  const { currentUser, userData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['breakfast-meals'],
    queryFn: fetchBreakfastMeals,
  });

  // Load user's cart from Supabase
  useEffect(() => {
    const loadCart = async () => {
      if (currentUser?.id) {
        try {
          console.log('Loading cart for user:', currentUser.id);
          const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', currentUser.id);

          if (error) throw error;

          console.log('Loaded cart items:', cartItems?.length || 0);

          const cartMap: Record<string, number> = {};
          (cartItems || []).forEach((item) => {
            cartMap[item.item_id] = (cartMap[item.item_id] || 0) + item.quantity;
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

  const addToCart = async (itemId: string, event?: React.MouseEvent) => {
    // Prevent card click event from firing
    if (event) {
      event.stopPropagation();
    }

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

      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: currentUser.id,
          item_id: itemId,
          name: item.name,
          price: item.price,
          quantity: 1
        });

      if (error) throw error;

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

  const removeFromCart = async (itemId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    if (!currentUser) {
      console.log('No current user, cannot remove from cart');
      return;
    }

    const item = menuItems.find(i => i.id === itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return;
    }

    console.log('Starting removeFromCart process:', { itemId, userUid: currentUser.id });

    try {
      // Get one cart item to delete
      const { data: cartItems, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('item_id', itemId)
        .limit(1);

      if (fetchError) throw fetchError;

      if (cartItems && cartItems.length > 0) {
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', cartItems[0].id);

        if (deleteError) throw deleteError;

        // Update local state
        setCart(prev => {
          const newCart = { ...prev };
          if (newCart[itemId] > 1) {
            newCart[itemId] -= 1;
          } else {
            delete newCart[itemId];
          }
          console.log('Updated local cart state:', newCart);
          return newCart;
        });

        toast({
          title: 'Removed from cart',
          description: `${item.name} has been removed from your cart`
        });
      } else {
        console.log('No matching cart items found');
        toast({
          title: 'Item not found in cart',
          description: 'The item may have already been removed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: 'Failed to remove from cart',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const clearUserCart = async () => {
    if (!currentUser?.id) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) throw error;
      console.log('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to place an order.",
        variant: "destructive"
      });
      return;
    }

    const totalItems = getTotalItems();
    if (totalItems === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before checking out.",
        variant: "destructive"
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

    // Open payment dialog instead of directly processing order
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      // Clear cart from Supabase after successful payment
      await clearUserCart();
      setCart({});

      // Show success message
      toast({
        title: "Order placed successfully!",
        description: `Your order of ${getTotalItems()} items has been placed and paid for. Delivery to ${userData?.selectedBlock || 'your location'}.`,
      });

      // Play notification sound
      playNotificationSound();
    } catch (error) {
      console.error("Error clearing cart:", error);
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

      {/* Cart Summary - Enhanced Visibility */}
      {getTotalItems() > 0 && (
        <Card className="sticky top-20 z-10 shadow-lg border-2 border-breakfast-400 bg-gradient-to-r from-breakfast-50 to-amber-100 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="bg-white rounded-full p-3 shadow-md">
                  <span className="text-2xl">🛒</span>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-lg font-bold text-breakfast-800">
                    {getTotalItems()} {getTotalItems() === 1 ? 'Item' : 'Items'} in Cart
                  </div>
                  <div className="text-2xl font-extrabold text-breakfast-900">
                    UGX {getTotalPrice().toLocaleString()}
                  </div>
                </div>
              </div>
              <Button
                className="breakfast-gradient text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all w-full sm:w-auto"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? 'Processing...' : '🔒 Proceed to Checkout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="menu-items-grid">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="menu-item-card border-breakfast-200 cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
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

            </CardHeader>
            <CardContent>
              <div className="menu-item-content">
                <span className="menu-item-price text-breakfast-800 font-bold">
                  UG Shs {item.price.toLocaleString()}
                </span>
                <div className="menu-item-actions">
                  {cart[item.id] > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="menu-item-incart text-breakfast-600">
                        {cart[item.id]} in cart
                      </span>
                      <Button
                        onClick={(e) => removeFromCart(item.id, e)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={(e) => addToCart(item.id, e)}
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

      {/* Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-amber-50">
          {selectedItem && (
            <div className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-breakfast-800 text-xl font-bold">
                  {selectedItem.name}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-2 -mx-6 px-6">
                <div className="relative">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {selectedItem.popular && (
                    <span className="absolute top-3 right-3 bg-amber-300 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Popular
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-2xl font-bold text-breakfast-800">
                    UG Shs {selectedItem.price.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedItem.preparationTime && (
                      <span className="text-sm text-breakfast-600 bg-breakfast-100 px-3 py-1 rounded-full">
                        ⏱ {selectedItem.preparationTime}
                      </span>
                    )}
                    <span className="text-sm text-breakfast-600 bg-breakfast-100 px-3 py-1 rounded-full">
                      {selectedItem.category}
                    </span>
                  </div>
                </div>

                {selectedItem.ingredients && (
                  <div>
                    <h3 className="text-lg font-semibold text-breakfast-800 mb-2">What's Included</h3>
                    <p className="text-breakfast-600 leading-relaxed">
                      {selectedItem.ingredients}
                    </p>
                  </div>
                )}

                {selectedItem.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-breakfast-800 mb-2">Description</h3>
                    <p className="text-breakfast-600 leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center justify-between pt-4 border-t border-breakfast-200 mt-4">
                <div className="flex items-center gap-3">
                  {cart[selectedItem.id] > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-breakfast-600 bg-breakfast-100 px-3 py-1 rounded-full text-sm">
                        {cart[selectedItem.id]} in cart
                      </span>
                      <Button
                        onClick={(e) => removeFromCart(selectedItem.id, e)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  onClick={(e) => addToCart(selectedItem.id, e)}
                  className="breakfast-gradient text-white px-6"
                  disabled={isAddingToCart === selectedItem.id}
                >
                  {isAddingToCart === selectedItem.id ? 'Adding...' : 'Add to Cart'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        cartItems={cart}
        menuItems={menuItems}
        totalAmount={getTotalPrice()}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Sticky Bottom Checkout Bar */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-breakfast-600 to-amber-600 shadow-2xl border-t-4 border-breakfast-700">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <span className="text-2xl">🛒</span>
                </div>
                <div className="text-white">
                  <div className="text-sm font-medium opacity-90">
                    {getTotalItems()} {getTotalItems() === 1 ? 'Item' : 'Items'}
                  </div>
                  <div className="text-xl font-bold">
                    UGX {getTotalPrice().toLocaleString()}
                  </div>
                </div>
              </div>
              <Button
                className="bg-white text-breakfast-700 hover:bg-breakfast-50 font-bold px-6 py-6 text-lg shadow-xl transform hover:scale-105 transition-all"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? 'Processing...' : '🔒 Checkout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import '../styles/Dashboard.css';

interface Order {
  id: string;
  userId: string;
  items: Array<{
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  totalAmount: number;
  status: string;
  deliveryLocation: string;
  createdAt: string;
}

const blocks = [
  { id: 'block-a', name: 'Block A ' },
  { id: 'block-b', name: 'Block B ' },
  { id: 'block-c', name: 'Block C ' },
  { id: 'block-d', name: 'Block D ' },
  { id: 'block-e', name: 'Block E ' },
];

const Dashboard = () => {
  const { userData, updateUserBlock, currentUser } = useAuth();
  const [selectedBlock, setSelectedBlock] = useState(userData?.selectedBlock || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMessage, setUserMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching user orders for dashboard...');
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(ordersQuery);
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));

        console.log('User orders fetched:', ordersData.length);
        setUserOrders(ordersData);
      } catch (error) {
        console.error('Error fetching user orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [currentUser]);

  const handleSendMessage = async () => {
    if (!userMessage.trim()) {
      toast({
        title: 'Please enter a message',
        description: 'Write something before sending.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to send a message.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSendingMessage(true);
      console.log('Sending message to admin:', userMessage);
      
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'adminMessages'), {
        userId: currentUser.uid,
        userName: userData?.name || 'Unknown User',
        userEmail: currentUser.email,
        message: userMessage,
        createdAt: new Date().toISOString(),
        isRead: false
      });

      toast({
        title: 'Message sent successfully!',
        description: 'Your message has been sent to the admin.',
      });
      
      setUserMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleBlockUpdate = async () => {
    if (!selectedBlock) {
      toast({
        title: 'Please select a location',
        description: 'Choose your campus block first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Updating user block to:', selectedBlock);
      await updateUserBlock(selectedBlock);
      toast({
        title: 'Location updated successfully!',
        description: 'Your campus location has been saved.',
      });
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: 'Error updating location',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedBlockName = blocks.find((b) => b.id === (userData?.selectedBlock || selectedBlock))?.name;

  // Calculate user statistics
  const totalOrders = userOrders.length;
  const thisMonthOrders = userOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  }).length;

  // Find most frequently ordered item
  const itemCounts: { [key: string]: number } = {};
  userOrders.forEach(order => {
    order.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  const favoriteItem = Object.keys(itemCounts).length > 0
    ? Object.keys(itemCounts).reduce((a, b) => itemCounts[a] > itemCounts[b] ? a : b)
    : '-';

  return (
    <div className="dashboard-root">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h1 className="dashboard-welcome-title">
            Welcome back, {userData?.name}! 👋
          </h1>
          <p className="dashboard-welcome-desc">
            Manage your breakfast preferences and orders with ease
          </p>
        </div>

        <div className="dashboard-grid">
          {/* Location Selection */}
          <Card className="dashboard-card-elevated lg:col-span-2">
            <CardHeader className="dashboard-card-header">
              <CardTitle className="dashboard-card-title dashboard-card-title-lg">
                <span>📍</span>
                <span>Your Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content dashboard-space-y-6">
              <div>
                <label className="dashboard-label">
                  Select your campus block:
                </label>
                <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                  <SelectTrigger className="custom-select h-12 text-base">
                    <SelectValue placeholder="Choose your block" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {blocks.map((block) => (
                      <SelectItem
                        key={block.id}
                        value={block.id}
                        className="hover:bg-accent/10 cursor-pointer"
                      >
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBlockUpdate}
                disabled={isUpdating || !selectedBlock}
                className="dashboard-btn-primary"
              >
                {isUpdating ? 'Updating...' : 'Update Location'}
              </Button>

              {userData?.selectedBlock && (
                <div className="dashboard-location-info">
                  <p>
                    <strong>Current location:</strong> {selectedBlockName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="dashboard-card-elevated">
            <CardHeader className="dashboard-card-header">
              <CardTitle className="dashboard-card-title">
                <span>📊</span>
                <span>Your Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content dashboard-space-y-4">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="dashboard-flex-between">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span className="font-semibold text-lg text-breakfast-800">{totalOrders}</span>
                  </div>
                  <div className="dashboard-flex-between">
                    <span className="text-muted-foreground">Favorite Item</span>
                    <span className="font-semibold text-breakfast-800 text-sm">{favoriteItem}</span>
                  </div>
                  <div className="dashboard-flex-between">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-semibold text-breakfast-800">{thisMonthOrders} orders</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message to Admin Section */}
        <Card className="dashboard-card-elevated mb-6">
          <CardHeader className="dashboard-card-header">
            <CardTitle className="dashboard-card-title dashboard-card-title-lg">
              <span>💬</span>
              <span>Message Admin</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-card-content dashboard-space-y-4">
            <div>
              <label className="dashboard-label">
                Send a message to the admin:
              </label>
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-breakfast-500 focus:border-transparent resize-vertical"
                maxLength={500}
              />
              <div className="text-sm text-gray-500 mt-1">
                {userMessage.length}/500 characters
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !userMessage.trim()}
              className="dashboard-btn-primary"
            >
              {isSendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="dashboard-card-elevated">
          <CardHeader className="dashboard-card-header">
            <CardTitle className="dashboard-card-title dashboard-card-title-lg">
              <span>⚡</span>
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-card-content">
            <div className="dashboard-quick-actions">
              <Button
                className="dashboard-quick-btn dashboard-quick-btn-primary"
                onClick={() => navigate('/menu')}
              >
                <span className="text-2xl">🍳</span>
                <span>Browse Menu</span>
              </Button>
              <Button
                variant="outline"
                className="dashboard-quick-btn dashboard-quick-btn-outline"
                onClick={() => navigate('/orders')}
              >
                <span className="text-2xl">📋</span>
                <span>Order History</span>
              </Button>
              <Button
                variant="outline"
                className="dashboard-quick-btn dashboard-quick-btn-outline"
                onClick={() => navigate('/settings')}
              >
                <span className="text-2xl">⚙️</span>
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

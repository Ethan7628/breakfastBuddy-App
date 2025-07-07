import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot } from 'firebase/firestore';
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

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  isRead: boolean;
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
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

  // Enhanced real-time chat messages listener with better error handling
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, skipping chat listener setup');
      return;
    }

    console.log('Setting up chat listener for user:', currentUser.uid);
    setChatError(null);

    try {
      const messagesQuery = query(
        collection(db, 'chatMessages'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          console.log('Chat messages snapshot received, docs:', snapshot.docs.length);
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId || '',
              userName: data.userName || 'Unknown User',
              userEmail: data.userEmail || '',
              message: data.message || '',
              isFromAdmin: data.isFromAdmin || false,
              createdAt: data.createdAt || new Date().toISOString(),
              isRead: data.isRead || false
            } as ChatMessage;
          });
          
          console.log('Processed messages:', messages.length);
          setChatMessages(messages);
          setChatError(null);
        },
        (error) => {
          console.error('Error in chat messages listener:', error);
          setChatError('Failed to load chat messages. Please refresh the page.');
          toast({
            title: 'Chat Error',
            description: 'Failed to load chat messages. Please refresh the page.',
            variant: 'destructive',
          });
        }
      );

      return () => {
        console.log('Cleaning up chat listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up chat listener:', error);
      setChatError('Failed to initialize chat. Please refresh the page.');
    }
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
      console.log('Sending chat message:', {
        userId: currentUser.uid,
        userName: userData?.name || 'Unknown User',
        userEmail: currentUser.email,
        message: userMessage
      });
      
      const messageData = {
        userId: currentUser.uid,
        userName: userData?.name || 'Unknown User',
        userEmail: currentUser.email || '',
        message: userMessage.trim(),
        isFromAdmin: false,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      const docRef = await addDoc(collection(db, 'chatMessages'), messageData);
      console.log('Message sent successfully with ID:', docRef.id);

      toast({
        title: 'Message sent!',
        description: 'Your message has been sent to the admin.',
      });
      
      setUserMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Please try again later. Check your internet connection.',
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

        {/* Enhanced Chat Section */}
        <Card className="dashboard-card-elevated mb-6">
          <CardHeader className="dashboard-card-header">
            <CardTitle className="dashboard-card-title dashboard-card-title-lg">
              <span>💬</span>
              <span>Chat with Admin</span>
              {chatError && (
                <span className="text-red-500 text-sm font-normal ml-2">
                  ({chatError})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-card-content dashboard-space-y-4">
            {/* Chat Messages */}
            <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3">
              {chatError ? (
                <div className="text-center text-red-500 py-4">
                  <p>{chatError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    Refresh Page
                  </Button>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No messages yet. Start a conversation with the admin!
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isFromAdmin
                          ? 'bg-blue-500 text-white'
                          : 'bg-breakfast-500 text-white'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.isFromAdmin ? 'Admin' : 'You'}
                      </div>
                      <div className="text-sm">{message.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-3">
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type your message to the admin..."
                className="min-h-[100px] resize-none"
                maxLength={500}
                disabled={!!chatError}
              />
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {userMessage.length}/500 characters
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !userMessage.trim() || !!chatError}
                  className="dashboard-btn-primary"
                >
                  {isSendingMessage ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
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

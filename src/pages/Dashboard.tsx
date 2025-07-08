
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
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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

  // Enhanced chat messages listener with better error handling
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user for chat');
      setChatLoading(false);
      return;
    }

    console.log('Setting up chat listener for user:', currentUser.uid);
    setChatLoading(true);
    setChatError(null);

    const setupChatListener = () => {
      try {
        const messagesQuery = query(
          collection(db, 'chatMessages'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
            console.log('Chat messages received:', snapshot.docs.length);
            
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
            
            setChatMessages(messages);
            setChatLoading(false);
            setChatError(null);
            setRetryCount(0);
            
            console.log('Chat messages updated successfully:', messages.length);
          },
          (error) => {
            console.error('Chat listener error:', error);
            setChatError('Failed to load messages. Please check your connection.');
            setChatLoading(false);
            
            // Retry logic with exponential backoff
            if (retryCount < 3) {
              const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              console.log(`Retrying chat connection in ${retryDelay}ms (attempt ${retryCount + 1})`);
              
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setupChatListener();
              }, retryDelay);
            } else {
              toast({
                title: 'Chat Connection Error',
                description: 'Unable to connect to chat. Please refresh the page.',
                variant: 'destructive',
              });
            }
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up chat listener:', error);
        setChatError('Failed to initialize chat connection.');
        setChatLoading(false);
        return null;
      }
    };

    const unsubscribe = setupChatListener();

    return () => {
      console.log('Cleaning up chat listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.uid, retryCount]);

  const handleSendMessage = async () => {
    if (!userMessage.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message before sending.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in to send messages.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingMessage(true);
    
    try {
      const messageData = {
        userId: currentUser.uid,
        userName: userData?.name || 'User',
        userEmail: currentUser.email || '',
        message: userMessage.trim(),
        isFromAdmin: false,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      console.log('Sending message:', messageData);
      
      await addDoc(collection(db, 'chatMessages'), messageData);
      
      setUserMessage('');
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Send Error',
        description: 'Failed to send message. Please try again.',
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

  const retryChatConnection = () => {
    setRetryCount(0);
    setChatError(null);
    setChatLoading(true);
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

        {/* Enhanced Chat Section with Better Error Handling */}
        <Card className="dashboard-card-elevated mb-6">
          <CardHeader className="dashboard-card-header">
            <CardTitle className="dashboard-card-title dashboard-card-title-lg">
              <span>💬</span>
              <span>Chat with Admin</span>
              {chatLoading && <span className="text-sm font-normal ml-2">(Connecting...)</span>}
              {chatError && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={retryChatConnection}
                  className="ml-2 text-xs"
                >
                  Retry Connection
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-card-content dashboard-space-y-4">
            {/* Error Display */}
            {chatError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-red-600 font-medium mb-2">⚠️ Connection Issue</div>
                <div className="text-red-700 text-sm mb-3">{chatError}</div>
                <Button 
                  size="sm" 
                  onClick={retryChatConnection}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Retry Now
                </Button>
              </div>
            )}

            {/* Chat Messages Display */}
            <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3 border">
              {chatLoading && !chatError ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breakfast-500 mx-auto mb-2"></div>
                  Connecting to chat...
                </div>
              ) : chatMessages.length === 0 && !chatError ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-2">👋 No messages yet!</p>
                  <p className="text-sm">Start a conversation with the admin below.</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                        message.isFromAdmin
                          ? 'bg-yellow-500 text-white rounded-bl-sm'
                          : 'bg-amber-800 text-white rounded-br-sm'
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-90">
                        {message.isFromAdmin ? '👨‍💼 Admin' : '👤 You'}
                      </div>
                      <div className="text-sm leading-relaxed">{message.message}</div>
                      <div className="text-xs opacity-75 mt-2">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input Section */}
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Type your message to the admin..."
                  className="min-h-[80px] resize-none pr-16"
                  maxLength={500}
                  disabled={isSendingMessage || chatError !== null}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {userMessage.length}/500
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Press Enter to send, Shift+Enter for new line
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !userMessage.trim() || chatError !== null}
                  className="dashboard-btn-primary"
                  size="sm"
                >
                  {isSendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <span className="ml-1">📤</span>
                    </>
                  )}
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

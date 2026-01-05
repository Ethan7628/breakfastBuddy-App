import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LocationPicker, LocationData } from '@/components/LocationPicker';
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
   const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
   const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedBlock, setSelectedBlock] = useState(userData?.selectedBlock || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMessage, setUserMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSectionOpen, setChatSectionOpen] = useState(false);
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
          where('userId', '==', currentUser.id)
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

  useEffect(() => {
    if (!currentUser) {
      console.log('No current user for chat');
      setChatLoading(false);
      return;
    }

    console.log('Setting up Supabase chat listener for user:', currentUser.id);
    setChatLoading(true);
    setChatError(null);

    const setupChatListener = async () => {
      try {
        // Fetch initial messages
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: ChatMessage[] = (messages || []).map(msg => ({
          id: msg.id,
          userId: msg.user_id,
          userName: msg.user_name,
          userEmail: msg.user_email,
          message: msg.message,
          isFromAdmin: msg.is_from_admin,
          createdAt: msg.created_at,
          isRead: msg.is_read
        }));
        
        setChatMessages(formattedMessages);
        setChatLoading(false);
        setChatError(null);
        console.log('Chat messages loaded successfully:', formattedMessages.length);

      } catch (error) {
        console.error('Error fetching chat messages:', error);
        setChatError('Unable to load chat messages. Please check your connection.');
        setChatLoading(false);
      }
    };

    setupChatListener();

    // Set up real-time subscription
    const channel = supabase
      .channel('user-chat-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Real-time chat update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage: ChatMessage = {
              id: payload.new.id,
              userId: payload.new.user_id,
              userName: payload.new.user_name,
              userEmail: payload.new.user_email,
              message: payload.new.message,
              isFromAdmin: payload.new.is_from_admin,
              createdAt: payload.new.created_at,
              isRead: payload.new.is_read
            };
            
            setChatMessages(prev => [...prev, newMessage]);
            
            // Show notification for new admin messages
            if (newMessage.isFromAdmin) {
              toast({
                title: 'New message from Admin',
                description: 'You have a new message',
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setChatMessages(prev =>
              prev.map(msg =>
                msg.id === payload.new.id
                  ? {
                      ...msg,
                      isRead: payload.new.is_read,
                      message: payload.new.message
                    }
                  : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setChatMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up chat listener');
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (chatSectionOpen && currentUser) {
      const markAdminMessagesAsRead = async () => {
        try {
          const unreadAdminMessages = chatMessages.filter(msg => 
            msg.isFromAdmin && !msg.isRead
          );

          if (unreadAdminMessages.length > 0) {
            const messageIds = unreadAdminMessages.map(msg => msg.id);
            
            const { error } = await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .in('id', messageIds);

            if (error) throw error;
            
            console.log(`Marked ${unreadAdminMessages.length} admin messages as read`);
          }
        } catch (error) {
          console.error('Error marking admin messages as read:', error);
        }
      };

      markAdminMessagesAsRead();
    }
  }, [chatSectionOpen, chatMessages, currentUser]);

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
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUser.id,
          user_name: userData?.name || 'User',
          user_email: currentUser.email || '',
          message: userMessage.trim(),
          is_from_admin: false,
          is_read: false
        });

      if (error) throw error;
      
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

  const handleLocationSelect = async (location: LocationData) => {
    setIsUpdatingLocation(true);
    try {
      // Store location as JSON string
      const locationString = JSON.stringify(location);
      await updateUserBlock(locationString);
      setCurrentLocation(location);
      toast({
        title: 'Location Updated',
        description: 'Your delivery location has been saved.',
      });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your location. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const retryChatConnection = () => {
    setChatError(null);
    setChatLoading(true);
    // Trigger re-fetch by changing a dependency
    window.location.reload();
  };

  const selectedBlockName = blocks.find((b) => b.id === (userData?.selectedBlock || selectedBlock))?.name;

  const totalOrders = userOrders.length;
  const thisMonthOrders = userOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  }).length;

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
          <Card className="dashboard-card-elevated lg:col-span-1">
                    <CardHeader className="dashboard-card-header">
                      <CardTitle className="dashboard-card-title dashboard-card-title-lg">
                        <span>📍</span>
                        <span>Delivery Location</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="dashboard-card-content">
                      <p className="text-muted-foreground mb-4">
                        Select your delivery location on the map. You can search for an address, 
                        use your current location, or click directly on the map.
                      </p>
                      
                      {isUpdatingLocation && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Updating location...</p>
                        </div>
                      )}
          
                      <LocationPicker
                        initialLocation={currentLocation || undefined}
                        onLocationSelect={handleLocationSelect}
                      />
          
                      {currentLocation && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>✓ Location saved:</strong> {currentLocation.address.length > 80 
                              ? currentLocation.address.substring(0, 80) + '...' 
                              : currentLocation.address}
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
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

        {/* Improved Chat Section with notification badge */}
        <Card className="dashboard-card-elevated mb-6">
          <CardHeader 
            className="dashboard-card-header cursor-pointer"
            onClick={() => setChatSectionOpen(!chatSectionOpen)}
          >
            <CardTitle className="dashboard-card-title dashboard-card-title-lg flex items-center justify-between">
              <div className="flex items-center">
                <span>💬</span>
                <span>Chat with Admin</span>
                {chatLoading && <span className="text-sm font-normal ml-2">(Loading...)</span>}
                {chatMessages.filter(msg => msg.isFromAdmin && !msg.isRead).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {chatMessages.filter(msg => msg.isFromAdmin && !msg.isRead).length} new
                  </span>
                )}
              </div>
              <span className="text-sm">
                {chatSectionOpen ? '▼' : '▶'}
              </span>
            </CardTitle>
          </CardHeader>
          {chatSectionOpen && (
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
                    Retry Connection
                  </Button>
                </div>
              )}

              {/* Chat Messages Display */}
              <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3 border">
                {chatLoading && !chatError ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-xs space-y-2">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-40'} rounded-lg`} />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
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
                    disabled={isSendingMessage}
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
                    disabled={isSendingMessage || !userMessage.trim()}
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
          )}
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

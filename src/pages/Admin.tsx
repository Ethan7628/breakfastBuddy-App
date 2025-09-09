import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { db, getAllCarts } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/utils/soundNotification';
import { useAuth } from '@/contexts/AuthContext';
import '../styles/Admin.css';

interface User {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  selectedBlock?: string;
  createdAt: string;
}

interface CartItem {
  id: string;
  userId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  addedAt: string;
}

interface Order {
  id: string;
  firebase_user_id: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
  total_amount: number;
  payment_status: string;
  currency: string;
  created_at: string;
  stripe_payment_intent_id?: string;
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

interface UserChat {
  userId: string;
  userName: string;
  userEmail: string;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageTime: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userChats, setUserChats] = useState<UserChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching admin data...');
        setLoading(true);
        
        // Fetch users
        try {
          console.log('Fetching users...');
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData = usersSnapshot.docs.map(doc => ({ 
            uid: doc.id, 
            ...doc.data() 
          } as User));
          console.log('Users fetched:', usersData.length);
          setUsers(usersData);
        } catch (userError) {
          console.error('Error fetching users:', userError);
          setUsers([]);
        }

        // Fetch all cart items
        try {
          console.log('Fetching cart items...');
          const cartData = await getAllCarts();
          console.log('Cart items fetched:', cartData.length);
          setCartItems(cartData as CartItem[]);
        } catch (cartError) {
          console.error('Error fetching cart items:', cartError);
          setCartItems([]);
        }

        // Fetch all orders from Supabase
        try {
          console.log('Fetching all orders from Supabase...');
          const { data: ordersData, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching orders from Supabase:', error);
            setOrders([]);
          } else {
            console.log('Orders fetched from Supabase:', ordersData?.length || 0);
            const transformedOrders: Order[] = (ordersData || []).map(order => ({
              ...order,
              items: Array.isArray(order.items) ? order.items as { id: string; quantity: number; }[] : []
            }));
            setOrders(transformedOrders);
          }
        } catch (orderError) {
          console.error('Error fetching orders:', orderError);
          setOrders([]);
        }

      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: 'Error loading data',
          description: 'Failed to fetch admin data. Check console for details.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (userData?.isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userData]);

  // Fixed admin chat listener
  useEffect(() => {
    if (!userData?.isAdmin) {
      console.log('User is not admin, skipping chat setup');
      return;
    }

    console.log('Setting up admin chat listener');
    setChatLoading(true);
    setChatError(null);

    let unsubscribeFn: (() => void) | null = null;

    const setupChatListener = async () => {
      try {
        // First try to fetch all messages directly
        console.log('Fetching all chat messages for admin...');
        const messagesSnapshot = await getDocs(collection(db, 'chatMessages'));
        
        console.log('Admin received chat messages:', messagesSnapshot.docs.length);
        
        const messages = messagesSnapshot.docs.map(doc => {
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

        // Sort messages by creation time
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Group messages by user
        const chatsByUser: { [userId: string]: UserChat } = {};
        
        messages.forEach(message => {
          if (!chatsByUser[message.userId]) {
            chatsByUser[message.userId] = {
              userId: message.userId,
              userName: message.userName,
              userEmail: message.userEmail,
              messages: [],
              unreadCount: 0,
              lastMessageTime: message.createdAt
            };
          }
          
          chatsByUser[message.userId].messages.push(message);
          
          // Update last message time
          if (message.createdAt > chatsByUser[message.userId].lastMessageTime) {
            chatsByUser[message.userId].lastMessageTime = message.createdAt;
          }
          
          // Count unread messages from users (not from admin)
          if (!message.isFromAdmin && !message.isRead) {
            chatsByUser[message.userId].unreadCount++;
          }
        });

        // Sort chats by latest message time
        const sortedChats = Object.values(chatsByUser).sort((a, b) => {
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });

        console.log('Processed admin chats:', sortedChats.length);
        setUserChats(sortedChats);
        setChatLoading(false);
        setChatError(null);

        // Now set up real-time listener for updates
        const messagesQuery = query(
          collection(db, 'chatMessages'),
          orderBy('createdAt', 'asc')
        );

        unsubscribeFn = onSnapshot(
          messagesQuery,
          (snapshot) => {
            console.log('Real-time admin chat update:', snapshot.docs.length);
            
            const updatedMessages = snapshot.docs.map(doc => {
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

            // Re-group messages by user
            const updatedChatsByUser: { [userId: string]: UserChat } = {};
            
            updatedMessages.forEach(message => {
              if (!updatedChatsByUser[message.userId]) {
                updatedChatsByUser[message.userId] = {
                  userId: message.userId,
                  userName: message.userName,
                  userEmail: message.userEmail,
                  messages: [],
                  unreadCount: 0,
                  lastMessageTime: message.createdAt
                };
              }
              
              updatedChatsByUser[message.userId].messages.push(message);
              
              if (message.createdAt > updatedChatsByUser[message.userId].lastMessageTime) {
                updatedChatsByUser[message.userId].lastMessageTime = message.createdAt;
              }
              
              if (!message.isFromAdmin && !message.isRead) {
                updatedChatsByUser[message.userId].unreadCount++;
              }
            });

            const updatedSortedChats = Object.values(updatedChatsByUser).sort((a, b) => {
              return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
            });

            // Check for new user messages
            const newUserMessages = updatedMessages.filter(msg => 
              !msg.isFromAdmin && !msg.isRead && 
              new Date(msg.createdAt).getTime() > Date.now() - 5000 // Last 5 seconds
            );

            if (newUserMessages.length > 0) {
              playNotificationSound();
              toast({
                title: 'New message from User',
                description: `You have ${newUserMessages.length} new message(s)`,
              });
            }

            setUserChats(updatedSortedChats);
          },
          (error) => {
            console.error('Real-time admin chat listener error:', error);
            // Don't show error for real-time updates since we have initial data
          }
        );

      } catch (error) {
        console.error('Error fetching admin chat messages:', error);
        setChatError('Failed to load chat messages. Please check your connection.');
        setChatLoading(false);
      }
    };

    setupChatListener();

    return () => {
      console.log('Cleaning up admin chat listener');
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [userData?.isAdmin]);

  // Auto-mark messages as read when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      const markMessagesAsRead = async () => {
        try {
          const selectedChatData = userChats.find(chat => chat.userId === selectedChat);
          if (!selectedChatData) return;

          const unreadMessages = selectedChatData.messages.filter(msg => 
            !msg.isFromAdmin && !msg.isRead
          );

          if (unreadMessages.length > 0) {
            const { updateDoc, doc } = await import('firebase/firestore');
            
            const updatePromises = unreadMessages.map(msg =>
              updateDoc(doc(db, 'chatMessages', msg.id), { isRead: true })
            );

            await Promise.all(updatePromises);
            console.log(`Auto-marked ${unreadMessages.length} messages as read for user ${selectedChat}`);
          }
        } catch (error) {
          console.error('Error auto-marking messages as read:', error);
        }
      };

      // Small delay to ensure the chat is fully loaded
      setTimeout(markMessagesAsRead, 500);
    }
  }, [selectedChat, userChats]);

  // Improved reply sending with better error handling
  const sendReplyToUser = async (userId: string, userName: string, userEmail: string) => {
    if (!replyMessage.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message before sending.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingReply(true);
    
    try {
      const messageData = {
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        message: replyMessage.trim(),
        isFromAdmin: true,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      console.log('Admin sending reply:', messageData);
      
      await addDoc(collection(db, 'chatMessages'), messageData);

      toast({
        title: 'Reply Sent',
        description: `Your message has been sent to ${userName}.`,
      });
      
      setReplyMessage('');
    } catch (error) {
      console.error('Error sending admin reply:', error);
      toast({
        title: 'Send Error',
        description: 'Failed to send reply. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const markUserMessagesAsRead = async (userId: string) => {
    try {
      console.log('Marking messages as read for user:', userId);
      
      const messagesQuery = query(
        collection(db, 'chatMessages'),
        where('userId', '==', userId),
        where('isFromAdmin', '==', false),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(messagesQuery);
      
      if (snapshot.docs.length === 0) {
        toast({
          title: 'No Unread Messages',
          description: 'All messages from this user are already read.',
        });
        return;
      }

      const updatePromises = snapshot.docs.map(messageDoc => 
        updateDoc(doc(db, 'chatMessages', messageDoc.id), { isRead: true })
      );

      await Promise.all(updatePromises);

      toast({
        title: 'Messages Marked as Read',
        description: `Marked ${snapshot.docs.length} messages as read.`,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark messages as read.',
        variant: 'destructive'
      });
    }
  };

  const retryChatConnection = () => {
    setChatError(null);
    setChatLoading(true);
    window.location.reload();
  };

  const resetAllUserData = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will clear the displayed admin data and attempt to reset user data where permissions allow. Are you sure you want to continue?"
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      let deletedCarts = 0;
      let deletedOrders = 0;
      let deletedChats = 0;

      // Try to clear cart items from Firebase (with error handling per document)
      console.log('Attempting to clear cart items...');
      try {
        const cartSnapshot = await getDocs(collection(db, 'userCarts'));
        console.log(`Found ${cartSnapshot.docs.length} cart items to delete`);
        
        for (const cartDoc of cartSnapshot.docs) {
          try {
            await deleteDoc(doc(db, 'userCarts', cartDoc.id));
            deletedCarts++;
          } catch (docError) {
            console.warn(`Could not delete cart item ${cartDoc.id}:`, docError);
          }
        }
      } catch (cartError) {
        console.warn('Error accessing cart collection:', cartError);
      }

      // Clear Supabase orders
      console.log('Attempting to clear Supabase orders...');
      try {
        const { error } = await supabase
          .from('orders')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all orders
        
        if (error) {
          console.warn('Error clearing Supabase orders:', error);
        } else {
          console.log('Successfully cleared Supabase orders');
          deletedOrders = orders.length; // Use the count we already have
        }
      } catch (supabaseOrderError) {
        console.warn('Error accessing Supabase orders:', supabaseOrderError);
      }

      // Try to clear chat messages from Firebase (with error handling per document)
      console.log('Attempting to clear chat messages...');
      try {
        const chatSnapshot = await getDocs(collection(db, 'chatMessages'));
        console.log(`Found ${chatSnapshot.docs.length} chat messages to delete`);
        
        for (const chatDoc of chatSnapshot.docs) {
          try {
            await deleteDoc(doc(db, 'chatMessages', chatDoc.id));
            deletedChats++;
          } catch (docError) {
            console.warn(`Could not delete chat message ${chatDoc.id}:`, docError);
          }
        }
      } catch (chatError) {
        console.warn('Error accessing chat collection:', chatError);
      }

      // Clear the displayed data regardless of Firebase operations
      setCartItems([]);
      setOrders([]);
      setUserChats([]);

      // Show success message with actual counts
      const totalDeleted = deletedCarts + deletedOrders + deletedChats;
      
      if (totalDeleted > 0) {
        toast({
          title: 'Partial Reset Complete!',
          description: `Successfully deleted ${deletedCarts} cart items, ${deletedOrders} orders, and ${deletedChats} chat messages. Supabase orders were cleared earlier.`,
        });
      } else {
        toast({
          title: 'Admin View Cleared!',
          description: 'Admin display has been reset. Note: Firebase permissions may prevent bulk deletion. Supabase orders were cleared earlier.',
          variant: 'default'
        });
      }

    } catch (error) {
      console.error('Error during reset operation:', error);
      
      // Still clear the display even if Firebase operations failed
      setCartItems([]);
      setOrders([]);
      setUserChats([]);
      
      toast({
        title: 'Admin View Cleared',
        description: 'Display cleared successfully. Some Firebase data may require manual deletion due to permission restrictions.',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: !currentStatus
      });

      setUsers(users.map(user =>
        user.uid === userId ? { ...user, isAdmin: !currentStatus } : user
      ));

      toast({
        title: 'Success',
        description: `User admin status ${!currentStatus ? 'granted' : 'revoked'}`,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive'
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, payment_status: newStatus } : order
      ));

      toast({
        title: 'Order updated',
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    }
  };

  if (!userData?.isAdmin) {
    return (
      <div className="admin-access-denied">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-breakfast-800 mb-4">Access Denied</h2>
            <p className="text-breakfast-600">You don't have admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.isAdmin).length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount / 100), 0);
  const totalUnreadMessages = userChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const selectedChatData = selectedChat ? userChats.find(chat => chat.userId === selectedChat) : null;

  return (
    <div className="admin-root">
      <div className="admin-center">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-desc">Manage users and monitor app activity</p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="admin-stat-label">Total Users</div>
              <div className="admin-stat-value">{totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="admin-stat-label">Admin Users</div>
              <div className="admin-stat-value">{adminUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="admin-stat-label">Total Orders</div>
              <div className="admin-stat-value">{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="admin-stat-label">Revenue</div>
              <div className="admin-stat-value">UGX {totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="admin-stat-label">Unread Messages</div>
              <div className="admin-stat-value">{totalUnreadMessages}</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Management Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-breakfast-800">Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-breakfast-600">
                Clear all user data including carts, orders, and chat messages. This action cannot be undone.
              </p>
              <Button 
                onClick={resetAllUserData}
                variant="destructive"
                disabled={loading}
              >
                {loading ? 'Clearing...' : 'Clear All User Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Management */}
        {orders.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-breakfast-800">Orders Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-breakfast-800">User</th>
                      <th className="text-left py-2 text-breakfast-800">Items</th>
                      <th className="text-left py-2 text-breakfast-800">Amount</th>
                      <th className="text-left py-2 text-breakfast-800">Type</th>
                      <th className="text-left py-2 text-breakfast-800">Status</th>
                      <th className="text-left py-2 text-breakfast-800">Date</th>
                      <th className="text-left py-2 text-breakfast-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold">User ID: {order.firebase_user_id}</div>
                            <div className="text-xs text-breakfast-600">Order #{order.id.slice(-6)}</div>
                          </div>
                        </td>
                        <td className="text-breakfast-700">
                          <div className="max-w-xs">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  {item.quantity}x Item ID: {item.id}
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">No items</div>
                            )}
                          </div>
                        </td>
                        <td className="text-breakfast-800 font-semibold">
                          {order.currency?.toUpperCase() || 'UGX'} {((order.total_amount || 0) / 100).toLocaleString()}
                        </td>
                        <td className="text-breakfast-700 text-xs">Payment</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="text-breakfast-600 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {order.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, 'paid')}
                                className="text-xs"
                              >
                                Mark Paid
                              </Button>
                            )}
                            {order.payment_status === 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, 'pending')}
                                className="text-xs"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center py-8 text-breakfast-600">
                    No orders found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-breakfast-800">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-breakfast-800">Name</th>
                    <th className="text-left py-2 text-breakfast-800">Email</th>
                    <th className="text-left py-2 text-breakfast-800">Admin</th>
                    <th className="text-left py-2 text-breakfast-800">Created</th>
                    <th className="text-left py-2 text-breakfast-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid} className="border-b">
                      <td className="py-3 text-breakfast-800">{user.name || 'No name'}</td>
                      <td className="text-breakfast-600">{user.email}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isAdmin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.isAdmin ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="text-breakfast-600 text-sm">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAdminStatus(user.uid, user.isAdmin)}
                          className="text-xs"
                        >
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-8 text-breakfast-600">
                  No users found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Communications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-breakfast-800">User Messages</CardTitle>
              {chatError && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-red-600 text-sm">{chatError}</span>
                  <Button size="sm" variant="outline" onClick={retryChatConnection}>
                    Retry
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {chatLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : userChats.length === 0 ? (
                <p className="text-breakfast-600">No messages yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userChats.map((chat) => (
                    <div
                      key={chat.userId}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedChat === chat.userId
                          ? 'bg-breakfast-50 border-breakfast-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedChat(chat.userId)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-breakfast-800">{chat.userName}</div>
                          <div className="text-xs text-breakfast-600">{chat.userEmail}</div>
                          <div className="text-sm text-breakfast-700 mt-1">
                            {chat.messages[chat.messages.length - 1]?.message.substring(0, 50)}...
                          </div>
                        </div>
                        <div className="text-right">
                          {chat.unreadCount > 0 && (
                            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                              {chat.unreadCount}
                            </span>
                          )}
                          <div className="text-xs text-breakfast-600 mt-1">
                            {new Date(chat.lastMessageTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-breakfast-800">
                {selectedChatData ? `Chat with ${selectedChatData.userName}` : 'Select a conversation'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedChatData ? (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-breakfast-50 rounded">
                    {selectedChatData.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-2 rounded max-w-[80%] ${
                          message.isFromAdmin
                            ? 'bg-breakfast-200 text-breakfast-800 ml-auto'
                            : 'bg-white text-breakfast-700 mr-auto'
                        }`}
                      >
                        <div className="text-sm">{message.message}</div>
                        <div className="text-xs text-breakfast-600 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => sendReplyToUser(
                          selectedChatData.userId, 
                          selectedChatData.userName, 
                          selectedChatData.userEmail
                        )}
                        disabled={isSendingReply || !replyMessage.trim()}
                        size="sm"
                      >
                        {isSendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => markUserMessagesAsRead(selectedChatData.userId)}
                        size="sm"
                      >
                        Mark as Read
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-breakfast-600">Select a conversation to view and reply to messages</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
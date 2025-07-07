import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, onSnapshot, where } from 'firebase/firestore';
import { db, getAllCarts } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
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
  userId: string;
  userEmail: string;
  userName: string;
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

        // Fetch all orders with improved error handling
        try {
          console.log('Fetching all orders...');
          const ordersSnapshot = await getDocs(collection(db, 'orders'));
          const ordersData = ordersSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              userEmail: data.userEmail || 'Unknown',
              userName: data.userName || 'Unknown User',
              items: data.items || [],
              totalAmount: data.totalAmount || 0,
              status: data.status || 'pending',
              deliveryLocation: data.deliveryLocation || 'Not specified',
              createdAt: data.createdAt || new Date().toISOString()
            } as Order;
          });
          
          ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          console.log('Orders fetched and sorted:', ordersData.length);
          setOrders(ordersData);
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

  // Simplified admin chat listener
  useEffect(() => {
    if (!userData?.isAdmin) {
      console.log('User is not admin, skipping chat setup');
      return;
    }

    console.log('Setting up admin chat listener');
    setChatLoading(true);

    const messagesQuery = query(
      collection(db, 'chatMessages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log('Admin received chat messages:', snapshot.docs.length);
        
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
      },
      (error) => {
        console.error('Admin chat listener error:', error);
        setChatLoading(false);
        toast({
          title: 'Chat Error',
          description: 'Failed to load chat messages.',
          variant: 'destructive'
        });
      }
    );

    return () => {
      console.log('Cleaning up admin chat listener');
      unsubscribe();
    };
  }, [userData?.isAdmin]);

  // Simplified reply sending
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
        description: 'Failed to send reply. Please try again.',
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
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
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
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="admin-desc">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-access-denied">
        <div className="admin-center">
          <div className="admin-spinner"></div>
          <p className="admin-loading-text">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.isAdmin).length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalUnreadMessages = userChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const selectedChatData = selectedChat ? userChats.find(chat => chat.userId === selectedChat) : null;

  return (
    <div className="admin-root">
      <div className="admin-center">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-desc">Manage users and monitor app activity</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{totalUsers}</div>
            <p className="admin-stats-card-desc">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{totalOrders}</div>
            <p className="admin-stats-card-desc">All orders placed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">UGX {totalRevenue.toLocaleString()}</div>
            <p className="admin-stats-card-desc">Total order value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{adminUsers}</div>
            <p className="admin-stats-card-desc">System administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Unread Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{totalUnreadMessages}</div>
            <p className="admin-stats-card-desc">New messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Improved Chat Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="admin-stats-card-title">
              User Chats ({userChats.length})
              {chatLoading && <span className="text-sm font-normal ml-2">(Loading...)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {chatLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-breakfast-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading chats...</p>
                </div>
              ) : userChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No conversations yet</p>
                </div>
              ) : (
                userChats.map((chat) => (
                  <div
                    key={chat.userId}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat === chat.userId ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedChat(chat.userId)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-breakfast-800 flex items-center">
                          <span className="mr-2">👤</span>
                          {chat.userName}
                        </div>
                        <div className="text-xs text-breakfast-600">{chat.userEmail}</div>
                        {chat.messages.length > 0 && (
                          <div className="text-sm text-gray-600 mt-1 truncate">
                            {chat.messages[chat.messages.length - 1].message}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(chat.lastMessageTime).toLocaleString()}
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Chat Window */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="admin-stats-card-title flex justify-between items-center">
              <span>
                {selectedChatData ? (
                  <span className="flex items-center">
                    <span className="mr-2">💬</span>
                    Chat with {selectedChatData.userName}
                  </span>
                ) : (
                  'Select a chat'
                )}
              </span>
              {selectedChatData && selectedChatData.unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markUserMessagesAsRead(selectedChatData.userId)}
                  className="text-xs"
                >
                  Mark as Read ({selectedChatData.unreadCount})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedChatData ? (
              <div className="space-y-4">
                {/* Messages */}
                <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3 border">
                  {selectedChatData.messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages in this conversation yet</p>
                    </div>
                  ) : (
                    selectedChatData.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                            message.isFromAdmin
                              ? 'bg-blue-500 text-white rounded-bl-sm'
                              : 'bg-breakfast-500 text-white rounded-br-sm'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1 opacity-90">
                            {message.isFromAdmin ? '👨‍💼 Admin (You)' : `👤 ${selectedChatData.userName}`}
                          </div>
                          <div className="text-sm leading-relaxed">{message.message}</div>
                          <div className="text-xs opacity-75 mt-2 flex justify-between">
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {!message.isFromAdmin && (
                              <span>{message.isRead ? '✓✓' : '✓'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder={`Reply to ${selectedChatData.userName}...`}
                      className="min-h-[80px] resize-none pr-16"
                      maxLength={500}
                      disabled={isSendingReply}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReplyToUser(
                            selectedChatData.userId,
                            selectedChatData.userName,
                            selectedChatData.userEmail
                          );
                        }
                      }}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                      {replyMessage.length}/500
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                    <Button
                      onClick={() => sendReplyToUser(
                        selectedChatData.userId,
                        selectedChatData.userName,
                        selectedChatData.userEmail
                      )}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      {isSendingReply ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <span>Send Reply</span>
                          <span className="ml-1">📤</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg">Select a conversation to start chatting</p>
                <p className="text-sm mt-2">Choose a user from the chat list to view their messages</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Orders Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="admin-stats-card-title">All Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-breakfast-800 font-mono text-xs">
                      #{order.id.substring(0, 8)}...
                    </td>
                    <td className="text-breakfast-800">
                      <div>
                        <div className="font-semibold">{order.userName}</div>
                        <div className="text-xs text-breakfast-600">{order.userEmail}</div>
                      </div>
                    </td>
                    <td className="text-breakfast-700">
                      <div className="max-w-xs">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.quantity}x {item.name}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500">No items</div>
                        )}
                      </div>
                    </td>
                    <td className="text-breakfast-800 font-semibold">
                      UGX {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="text-breakfast-700 text-xs">{order.deliveryLocation}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                        order.status === 'delivered' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="text-breakfast-600 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="text-xs"
                          >
                            Start
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="text-xs"
                          >
                            Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            className="text-xs"
                          >
                            Deliver
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="admin-stats-card-title">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Orders</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userOrderCount = orders.filter(order => order.userId === user.uid).length;
                  return (
                    <tr key={user.uid}>
                      <td className="text-breakfast-800">{user.name}</td>
                      <td className="text-breakfast-700">{user.email}</td>
                      <td>
                        {user.isAdmin ? (
                          <span className="admin-badge-admin">Admin</span>
                        ) : (
                          <span className="admin-badge-user">User</span>
                        )}
                      </td>
                      <td className="text-breakfast-700">
                        {user.selectedBlock ? user.selectedBlock.replace('block-', 'Block ').toUpperCase() : '-'}
                      </td>
                      <td className="text-breakfast-700">{userOrderCount} orders</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdminStatus(user.uid, user.isAdmin)}
                          disabled={user.uid === userData?.uid}
                          className="admin-action-btn text-breakfast-700 border-breakfast-300"
                        >
                          {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
};

export default Admin;

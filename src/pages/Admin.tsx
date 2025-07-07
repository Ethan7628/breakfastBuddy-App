import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, getAllCarts } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface AdminMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
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

        // Fetch admin messages
        try {
          console.log('Fetching admin messages...');
          const messagesSnapshot = await getDocs(collection(db, 'adminMessages'));
          const messagesData = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AdminMessage));
          
          // Sort messages by creation date (newest first)
          messagesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          console.log('Admin messages fetched:', messagesData.length);
          setAdminMessages(messagesData);
        } catch (messageError) {
          console.error('Error fetching admin messages:', messageError);
          setAdminMessages([]);
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
              // Ensure required fields exist
              userEmail: data.userEmail || 'Unknown',
              userName: data.userName || 'Unknown User',
              items: data.items || [],
              totalAmount: data.totalAmount || 0,
              status: data.status || 'pending',
              deliveryLocation: data.deliveryLocation || 'Not specified',
              createdAt: data.createdAt || new Date().toISOString()
            } as Order;
          });
          
          // Sort orders by creation date (newest first)
          ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          console.log('Orders fetched and sorted:', ordersData.length);
          console.log('Sample order:', ordersData[0]);
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

  const markMessageAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'adminMessages', messageId), {
        isRead: true
      });

      setAdminMessages(adminMessages.map(message =>
        message.id === messageId ? { ...message, isRead: true } : message
      ));

      toast({
        title: 'Message marked as read',
        description: 'Message status updated successfully.',
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update message status',
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
  const unreadMessages = adminMessages.filter(m => !m.isRead).length;

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
            <CardTitle className="admin-stats-card-title">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{unreadMessages}</div>
            <p className="admin-stats-card-desc">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Messages */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="admin-stats-card-title">User Messages ({adminMessages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminMessages.map((message) => (
                  <tr key={message.id} className={!message.isRead ? 'bg-yellow-50' : ''}>
                    <td className="text-breakfast-800">
                      <div>
                        <div className="font-semibold">{message.userName}</div>
                        <div className="text-xs text-breakfast-600">{message.userEmail}</div>
                      </div>
                    </td>
                    <td className="text-breakfast-700">
                      <div className="max-w-xs">
                        <p className="text-sm line-clamp-3">{message.message}</p>
                      </div>
                    </td>
                    <td className="text-breakfast-600 text-xs">
                      {new Date(message.createdAt).toLocaleDateString()}
                      <br />
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        message.isRead 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {message.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td>
                      {!message.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markMessageAsRead(message.id)}
                          className="text-xs"
                        >
                          Mark as Read
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {adminMessages.length === 0 && (
              <div className="text-center py-8 text-breakfast-600">
                No messages found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

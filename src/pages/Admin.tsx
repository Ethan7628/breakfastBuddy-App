
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

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setUsers(usersData);

        // Fetch all cart items
        const cartData = await getAllCarts();
        setCartItems(cartData as CartItem[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error loading data',
          description: 'Failed to fetch admin data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
  const totalOrders = cartItems.length;
  const totalRevenue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Group cart items by user
  const ordersByUser = cartItems.reduce((acc, item) => {
    if (!acc[item.userId]) {
      acc[item.userId] = [];
    }
    acc[item.userId].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

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
            <p className="admin-stats-card-desc">Items in carts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">${totalRevenue.toFixed(2)}</div>
            <p className="admin-stats-card-desc">Total cart value</p>
          </CardContent>
        </Card>
      </div>

      {/* Cart Items Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="admin-stats-card-title">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.slice(0, 10).map((item) => {
                  const user = users.find(u => u.uid === item.userId);
                  return (
                    <tr key={item.id}>
                      <td className="text-breakfast-800">{user?.name || 'Unknown'}</td>
                      <td className="text-breakfast-700">{item.name}</td>
                      <td className="text-breakfast-700">${item.price.toFixed(2)}</td>
                      <td className="text-breakfast-700">{item.quantity}</td>
                      <td className="text-breakfast-800 font-semibold">${(item.price * item.quantity).toFixed(2)}</td>
                      <td className="text-breakfast-600">{new Date(item.addedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  const userOrders = ordersByUser[user.uid] || [];
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
                      <td className="text-breakfast-700">{userOrders.length} items</td>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;

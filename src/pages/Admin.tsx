import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(usersQuery);
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error loading users',
          description: 'Failed to fetch user data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: !currentStatus
      });

      // Also update in admins collection
      if (!currentStatus) {
        await updateDoc(doc(db, 'admins', userId), {
          email: users.find(u => u.uid === userId)?.email,
          role: 'admin'
        });
      } else {
        await updateDoc(doc(db, 'admins', userId), {
          role: 'revoked'
        });
      }

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
  const usersWithBlocks = users.filter(u => u.selectedBlock).length;

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
            <CardTitle className="admin-stats-card-title">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{adminUsers}</div>
            <p className="admin-stats-card-desc">Admin accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="admin-stats-card-title">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-stats-card-value">{usersWithBlocks}</div>
            <p className="admin-stats-card-desc">Users with selected blocks</p>
          </CardContent>
        </Card>
      </div>

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
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {user.isAdmin ? (
                        <span className="admin-badge-admin">Admin</span>
                      ) : (
                        <span className="admin-badge-user">User</span>
                      )}
                    </td>
                    <td>
                      {user.selectedBlock ? user.selectedBlock.replace('block-', 'Block ').toUpperCase() : '-'}
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdminStatus(user.uid, user.isAdmin)}
                        disabled={user.uid === userData?.uid}
                        className="admin-action-btn"
                      >
                        {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(usersQuery);
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.isAdmin).length;
  const usersWithBlocks = users.filter(u => u.selectedBlock).length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-breakfast-800 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users and monitor app activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-breakfast-700">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-breakfast-800">{totalUsers}</div>
            <p className="text-sm text-gray-600">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-breakfast-700">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-breakfast-800">{adminUsers}</div>
            <p className="text-sm text-gray-600">Admin accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-breakfast-700">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-breakfast-800">{usersWithBlocks}</div>
            <p className="text-sm text-gray-600">Users with selected blocks</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-breakfast-700">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-breakfast-200">
                  <th className="text-left p-3 font-semibold text-breakfast-800">Name</th>
                  <th className="text-left p-3 font-semibold text-breakfast-800">Email</th>
                  <th className="text-left p-3 font-semibold text-breakfast-800">Role</th>
                  <th className="text-left p-3 font-semibold text-breakfast-800">Location</th>
                  <th className="text-left p-3 font-semibold text-breakfast-800">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="border-b border-gray-100 hover:bg-breakfast-50">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3">
                      {user.isAdmin ? (
                        <Badge className="breakfast-gradient text-white">Admin</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </td>
                    <td className="p-3 text-gray-600">
                      {user.selectedBlock ? user.selectedBlock.replace('block-', 'Block ').toUpperCase() : '-'}
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
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

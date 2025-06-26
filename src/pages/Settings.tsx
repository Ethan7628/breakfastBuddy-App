
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { initializeAdmin } from '@/lib/firebase';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser } = useAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !adminPassword) {
      toast({
        title: 'Missing information',
        description: 'Please provide both email and password',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingAdmin(true);

    try {
      await initializeAdmin(adminEmail, adminPassword);
      toast({
        title: 'Admin created successfully!',
        description: 'The admin account has been created'
      });
      setAdminEmail('');
      setAdminPassword('');
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: 'Failed to create admin',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="settings-root">
      <div className="settings-center">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-desc">Manage your application settings</p>
      </div>

      <div className="settings-grid">
        {/* Admin Management */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">Admin Management</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="settings-form">
              <div className="settings-form-group">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div className="settings-form-group">
                <Label htmlFor="admin-password">Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter secure password"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="settings-btn"
                disabled={isCreatingAdmin}
              >
                {isCreatingAdmin ? 'Creating Admin...' : 'Create Admin Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* App Configuration */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">App Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">Current User:</span>
                <span className="settings-info-value">{currentUser?.email || 'Not logged in'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">User Role:</span>
                <span className="settings-info-value">Admin</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">App Version:</span>
                <span className="settings-info-value">1.0.0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-status">
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Firebase Connected</span>
              </div>
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Database Active</span>
              </div>
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Authentication Working</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

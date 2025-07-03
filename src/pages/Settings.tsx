import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser, userData, updateUserBlock } = useAuth();
  const [selectedBlock, setSelectedBlock] = useState(userData?.selectedBlock || '');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const adminEmail = "kusasirakwe.ethan.upti@gmail.com";
  const isAdmin = currentUser?.email === adminEmail;

  const blocks = [
    { id: 'block-a', name: 'Block A' },
    { id: 'block-b', name: 'Block B' },
    { id: 'block-c', name: 'Block C' },
    { id: 'block-d', name: 'Block D' },
    { id: 'block-e', name: 'Block E' },
    { id: 'block-f', name: 'Block F' },
  ];

  const handleLocationUpdate = async () => {
    if (!selectedBlock) {
      toast({
        title: 'Location Required',
        description: 'Please select a location before saving.',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdatingLocation(true);
    try {
      await updateUserBlock(selectedBlock);
      toast({
        title: 'Location Updated',
        description: `Your location has been set to ${blocks.find(b => b.id === selectedBlock)?.name || selectedBlock}`,
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

  return (
    <div className="settings-root">
      <div className="settings-center">
        <h1 className="settings-title">Account Settings</h1>
        <p className="settings-desc">Manage your account preferences and view system information</p>
      </div>

      <div className="settings-grid">
        {/* Account Information */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <span>👤</span>
              Your Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">Full Name</span>
                <span className="settings-info-value">{userData?.name || 'Not provided'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Email Address</span>
                <span className="settings-info-value">{currentUser?.email || 'Not logged in'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Account Type</span>
                <span className={isAdmin ? "settings-account-type-admin" : "settings-account-type-user"}>
                  {isAdmin ? "Administrator" : "User"}
                </span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Member Since</span>
                <span className="settings-info-value">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Not available'}
                </span>
              </div>
              {userData?.selectedBlock && (
                <div className="settings-info-item">
                  <span className="settings-info-label">Current Location</span>
                  <span className="settings-info-value">{userData.selectedBlock.replace('-', ' ').toUpperCase()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Settings */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <span>📍</span>
              Delivery Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-form">
              <div className="settings-form-group">
                <label htmlFor="location">Select Your Block</label>
                <select
                  id="location"
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full px-3 py-2 border border-breakfast-300 rounded-md focus:outline-none focus:ring-2 focus:ring-breakfast-500"
                >
                  <option value="">Choose your block...</option>
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleLocationUpdate}
                disabled={isUpdatingLocation || !selectedBlock}
                className="settings-btn w-full"
              >
                {isUpdatingLocation ? 'Updating...' : 'Update Location'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <span>🔧</span>
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-status">
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Authentication Service</span>
              </div>
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Database Connection</span>
              </div>
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Order Processing</span>
              </div>
              <div className="settings-status-item">
                <span className="settings-status-dot settings-status-online"></span>
                <span>Payment Gateway</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <span>📱</span>
              Application Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">App Version</span>
                <span className="settings-info-value">2.1.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Environment</span>
                <span className="settings-info-value">Production</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Last Update</span>
                <span className="settings-info-value">January 2025</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Build Number</span>
                <span className="settings-info-value">2025.01.02</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support & Help */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <span>💡</span>
              Support & Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">Help Center</span>
                <span className="settings-info-value">Available 24/7</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Contact Support</span>
                <span className="settings-info-value">support@breakfastbuddy.com</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Response Time</span>
                <span className="settings-info-value">Within 2 hours</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Knowledge Base</span>
                <span className="settings-info-value">50+ Articles</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

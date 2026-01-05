import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseRole } from '@/hooks/useSupabaseRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { LocationPicker, LocationData } from '@/components/LocationPicker';
import '../styles/Dashboard.css';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser, userData, updateUserBlock } = useAuth();
  const { isAdmin } = useSupabaseRole();
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  // Parse existing location data
  useEffect(() => {
    if (userData?.selectedBlock) {
      try {
        const parsed = JSON.parse(userData.selectedBlock);
        if (parsed.lat && parsed.lng) {
          setCurrentLocation(parsed);
        }
      } catch {
        // Legacy format - not JSON, just a block name
        setCurrentLocation(null);
      }
    }
  }, [userData?.selectedBlock]);

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

  // Format location for display
  const getDisplayLocation = () => {
    if (!userData?.selectedBlock) return null;
    
    try {
      const parsed = JSON.parse(userData.selectedBlock);
      if (parsed.address) {
        // Truncate long addresses
        return parsed.address.length > 60 
          ? parsed.address.substring(0, 60) + '...' 
          : parsed.address;
      }
    } catch {
      // Legacy format
      return userData.selectedBlock.replace('-', ' ').toUpperCase();
    }
    return null;
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
              {getDisplayLocation() && (
                <div className="settings-info-item">
                  <span className="settings-info-label">Delivery Location</span>
                  <span className="settings-info-value">{getDisplayLocation()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Settings with Map */}
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
                <span className="settings-info-value">January 2026</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Build Number</span>
                <span className="settings-info-value">2026.02</span>
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

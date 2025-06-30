
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser, userData } = useAuth();

  return (
    <div className="settings-root">
      <div className="settings-center">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-desc">Manage your application settings</p>
      </div>

      <div className="settings-grid">
        {/* App Configuration */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">Name:</span>
                <span className="settings-info-value">{userData?.name || 'Not available'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Email:</span>
                <span className="settings-info-value">{currentUser?.email || 'Not logged in'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">User Role:</span>
                <span className="settings-info-value">{userData?.isAdmin ? 'Admin' : 'User'}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Account Created:</span>
                <span className="settings-info-value">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Not available'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">App Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <div className="settings-info-item">
                <span className="settings-info-label">App Version:</span>
                <span className="settings-info-value">1.0.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Build:</span>
                <span className="settings-info-value">Production</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Last Updated:</span>
                <span className="settings-info-value">December 2024</span>
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

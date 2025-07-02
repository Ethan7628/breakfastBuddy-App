
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser, userData } = useAuth();
  const adminEmail = "kusasirakwe.ethan.upti@gmail.com";
  const isAdmin = currentUser?.email === adminEmail;

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
                <span className="settings-info-value">
                  {isAdmin ? (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Administrator</span>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 600 }}>Student</span>
                  )}
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
                  <span className="settings-info-label">Campus Location</span>
                  <span className="settings-info-value">{userData.selectedBlock.replace('-', ' ').toUpperCase()}</span>
                </div>
              )}
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

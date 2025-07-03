
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const blocks = [
  { id: 'block-a', name: 'Block A - North Campus' },
  { id: 'block-b', name: 'Block B - South Campus' },
  { id: 'block-c', name: 'Block C - East Campus' },
  { id: 'block-d', name: 'Block D - West Campus' },
  { id: 'block-e', name: 'Block E - Central Campus' },
];

const Dashboard = () => {
  const { userData, updateUserBlock } = useAuth();
  const [selectedBlock, setSelectedBlock] = useState(userData?.selectedBlock || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  const handleBlockUpdate = async () => {
    if (!selectedBlock) {
      toast({
        title: 'Please select a location',
        description: 'Choose your campus block first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Updating user block to:', selectedBlock);
      await updateUserBlock(selectedBlock);
      toast({ 
        title: 'Location updated successfully!',
        description: 'Your campus location has been saved.',
      });
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: 'Error updating location',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedBlockName = blocks.find((b) => b.id === (userData?.selectedBlock || selectedBlock))?.name;

  return (
    <div className="dashboard-root">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h1 className="dashboard-welcome-title">
            Welcome back, {userData?.name}! 👋
          </h1>
          <p className="dashboard-welcome-desc">
            Manage your breakfast preferences and orders with ease
          </p>
        </div>

        <div className="dashboard-grid">
          {/* Location Selection */}
          <Card className="dashboard-card-elevated lg:col-span-2">
            <CardHeader className="dashboard-card-header">
              <CardTitle className="dashboard-card-title dashboard-card-title-lg">
                <span>📍</span>
                <span>Your Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content dashboard-space-y-6">
              <div>
                <label className="dashboard-label">
                  Select your campus block:
                </label>
                <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                  <SelectTrigger className="custom-select h-12 text-base">
                    <SelectValue placeholder="Choose your block" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {blocks.map((block) => (
                      <SelectItem
                        key={block.id}
                        value={block.id}
                        className="hover:bg-accent/10 cursor-pointer"
                      >
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBlockUpdate}
                disabled={isUpdating || !selectedBlock}
                className="dashboard-btn-primary"
              >
                {isUpdating ? 'Updating...' : 'Update Location'}
              </Button>

              {userData?.selectedBlock && (
                <div className="dashboard-location-info">
                  <p>
                    <strong>Current location:</strong> {selectedBlockName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="dashboard-card-elevated">
            <CardHeader className="dashboard-card-header">
              <CardTitle className="dashboard-card-title">
                <span>📊</span>
                <span>Your Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content dashboard-space-y-4">
              <div className="dashboard-flex-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-semibold text-lg text-breakfast-800">0</span>
              </div>
              <div className="dashboard-flex-between">
                <span className="text-muted-foreground">Favorite Item</span>
                <span className="font-semibold text-breakfast-800">-</span>
              </div>
              <div className="dashboard-flex-between">
                <span className="text-muted-foreground">This Month</span>
                <span className="font-semibold text-breakfast-800">0 orders</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="dashboard-card-elevated">
          <CardHeader className="dashboard-card-header">
            <CardTitle className="dashboard-card-title dashboard-card-title-lg">
              <span>⚡</span>
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-card-content">
            <div className="dashboard-quick-actions">
              <Button
                className="dashboard-quick-btn dashboard-quick-btn-primary"
                onClick={() => navigate('/menu')}
              >
                <span className="text-2xl">🍳</span>
                <span>Browse Menu</span>
              </Button>
              <Button
                variant="outline"
                className="dashboard-quick-btn dashboard-quick-btn-outline"
                onClick={() => navigate('/orders')}
              >
                <span className="text-2xl">📋</span>
                <span>Order History</span>
              </Button>
              <Button
                variant="outline"
                className="dashboard-quick-btn dashboard-quick-btn-outline"
                onClick={() => navigate('/settings')}
              >
                <span className="text-2xl">⚙️</span>
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

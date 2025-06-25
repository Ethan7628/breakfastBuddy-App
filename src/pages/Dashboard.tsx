
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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

  const handleBlockUpdate = async () => {
    if (!selectedBlock) return;
    
    try {
      await updateUserBlock(selectedBlock);
      toast({ title: 'Location updated successfully!' });
    } catch (error) {
      console.error('Error updating block:', error);
      toast({ 
        title: 'Error updating location', 
        variant: 'destructive' 
      });
    }
  };

  const selectedBlockName = blocks.find(b => b.id === (userData?.selectedBlock || selectedBlock))?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-breakfast-50 to-sunrise-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-breakfast-800 mb-4">
            Welcome back, {userData?.name}! 👋
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your breakfast preferences and orders with ease
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Location Selection */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-breakfast-700 flex items-center space-x-2">
                <span>📍</span>
                <span>Your Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
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
              
              {selectedBlock !== userData?.selectedBlock && (
                <Button 
                  onClick={handleBlockUpdate} 
                  className="btn-primary w-full h-12 text-base"
                >
                  Update Location
                </Button>
              )}
              
              {userData?.selectedBlock && (
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground">
                    <strong>Current location:</strong> {selectedBlockName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="card-elevated">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl text-breakfast-700 flex items-center space-x-2">
                <span>📊</span>
                <span>Your Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-semibold text-lg text-breakfast-800">0</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Favorite Item</span>
                  <span className="font-semibold text-breakfast-800">-</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">This Month</span>
                  <span className="font-semibold text-breakfast-800">0 orders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl text-breakfast-700 flex items-center space-x-2">
              <span>⚡</span>
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Button 
                className="h-24 flex flex-col space-y-3 btn-primary text-lg"
                onClick={() => window.location.href = '/menu'}
              >
                <span className="text-2xl">🍳</span>
                <span>Browse Menu</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col space-y-3 border-2 border-border hover:bg-accent/10 hover:border-accent text-lg"
              >
                <span className="text-2xl">📋</span>
                <span>Order History</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col space-y-3 border-2 border-border hover:bg-accent/10 hover:border-accent text-lg"
              >
                <span className="text-2xl">⚙️</span>
                <span>Preferences</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

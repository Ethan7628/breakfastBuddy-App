
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-breakfast-800 mb-2">
          Welcome back, {userData?.name}!
        </h1>
        <p className="text-gray-600">Manage your breakfast preferences and orders</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Location Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-breakfast-700">Your Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Select your campus block:</p>
              <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBlock !== userData?.selectedBlock && (
              <Button 
                onClick={handleBlockUpdate} 
                className="w-full breakfast-gradient text-white"
              >
                Update Location
              </Button>
            )}
            {userData?.selectedBlock && (
              <div className="p-3 bg-breakfast-50 rounded-lg">
                <p className="text-sm text-breakfast-800">
                  <strong>Current location:</strong> {selectedBlockName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-breakfast-700">Your Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-semibold text-breakfast-800">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Favorite Item</span>
                <span className="font-semibold text-breakfast-800">-</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold text-breakfast-800">0 orders</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-breakfast-700">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                className="h-20 flex flex-col space-y-2 breakfast-gradient text-white"
                onClick={() => window.location.href = '/menu'}
              >
                <span className="text-lg">🍳</span>
                <span>Browse Menu</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2 border-breakfast-200 hover:bg-breakfast-50"
              >
                <span className="text-lg">📋</span>
                <span>Order History</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2 border-breakfast-200 hover:bg-breakfast-50"
              >
                <span className="text-lg">⚙️</span>
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

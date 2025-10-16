
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  quantity: number;
}

interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  payment_status: string;
  currency: string;
  created_at: string;
}

const Orders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching orders for user:', currentUser.id);
        
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching orders:', error);
          return;
        }
        
        console.log('Orders fetched:', ordersData?.length || 0);
        
        // Transform the data to match our Order interface
        const transformedOrders: Order[] = (ordersData || []).map(order => ({
          id: order.id,
          user_id: order.user_id,
          items: (order.items as unknown as OrderItem[]) || [],
          total_amount: order.total_amount,
          payment_status: order.payment_status || 'pending',
          currency: order.currency || 'ugx',
          created_at: order.created_at || new Date().toISOString()
        }));
        
        setOrders(transformedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600 mx-auto"></div>
          <p className="mt-4 text-breakfast-700">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-breakfast-800 mb-2">Your Orders</h1>
        <p className="text-breakfast-600">Track your breakfast delivery history</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-breakfast-600 text-lg">No orders yet!</p>
            <p className="text-breakfast-500 mt-2">Visit our menu to place your first order.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="border-breakfast-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-breakfast-800">
                      Order #{order.id.slice(-6)}
                    </CardTitle>
                    <p className="text-breakfast-600 text-sm">
                      {new Date(order.created_at).toLocaleDateString()} at{' '}
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.payment_status)}`}>
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                    {order.payment_status === 'pending' && (
                      <p className="text-xs text-breakfast-600">Payment pending</p>
                    )}
                    {order.payment_status === 'paid' && (
                      <p className="text-xs text-green-600">Payment successful!</p>
                    )}
                    {order.payment_status === 'failed' && (
                      <p className="text-xs text-red-600">Payment failed</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-breakfast-800 mb-2">Items:</h4>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-breakfast-50 rounded-lg border border-breakfast-100">
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-breakfast-800 font-medium">
                                  Item ID: {item.id}
                                </span>
                                <p className="text-breakfast-600 text-sm">
                                  Quantity: {item.quantity}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-breakfast-600">
                          <strong>Currency:</strong> {order.currency?.toUpperCase() || 'UGX'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-breakfast-800 font-bold text-lg">
                          Total: {order.currency?.toUpperCase() || 'UGX'} {order.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;


import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  deliveryLocation: string;
  createdAt: string;
}

const Orders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;

      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(ordersQuery);
        const ordersData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Order));
        
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'preparing': return 'default';
      case 'ready': return 'outline';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
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
                      {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-breakfast-800 mb-2">Items:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-breakfast-700">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="text-breakfast-800 font-semibold">
                            ${item.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-breakfast-600">
                          <strong>Delivery to:</strong> {order.deliveryLocation}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-breakfast-800 font-bold text-lg">
                          Total: ${order.totalAmount.toFixed(2)}
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

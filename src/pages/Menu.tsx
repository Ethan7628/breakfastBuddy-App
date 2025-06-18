
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  popular?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Classic Pancakes',
    description: 'Fluffy pancakes served with maple syrup and butter',
    price: 8.99,
    category: 'Pancakes',
    image: '🥞',
    popular: true
  },
  {
    id: '2',
    name: 'Scrambled Eggs & Toast',
    description: 'Fresh scrambled eggs with buttered toast',
    price: 6.99,
    category: 'Eggs',
    image: '🍳'
  },
  {
    id: '3',
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with lime and seasoning',
    price: 9.99,
    category: 'Toast',
    image: '🥑',
    popular: true
  },
  {
    id: '4',
    name: 'French Toast',
    description: 'Golden french toast with cinnamon and powdered sugar',
    price: 9.49,
    category: 'Toast',
    image: '🍞'
  },
  {
    id: '5',
    name: 'Breakfast Burrito',
    description: 'Eggs, cheese, potatoes, and sausage wrapped in a tortilla',
    price: 10.99,
    category: 'Wraps',
    image: '🌯'
  },
  {
    id: '6',
    name: 'Fresh Fruit Bowl',
    description: 'Seasonal fresh fruits with granola and honey',
    price: 7.99,
    category: 'Healthy',
    image: '🍓'
  }
];

const categories = ['All', 'Pancakes', 'Eggs', 'Toast', 'Wraps', 'Healthy'];

const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
    toast({ title: 'Added to cart!' });
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((total, [itemId, count]) => {
      const item = menuItems.find(i => i.id === itemId);
      return total + (item ? item.price * count : 0);
    }, 0);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-breakfast-800 mb-2">Breakfast Menu</h1>
        <p className="text-gray-600">Delicious breakfast options to start your day right</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "breakfast-gradient text-white" : ""}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Cart Summary */}
      {getTotalItems() > 0 && (
        <Card className="mb-6 bg-breakfast-50 border-breakfast-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-breakfast-800">
                  Cart: {getTotalItems()} items
                </span>
                <span className="text-breakfast-600 ml-4">
                  Total: ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              <Button className="breakfast-gradient text-white">
                Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-4xl mb-2">{item.image}</div>
                {item.popular && (
                  <Badge className="breakfast-gradient text-white">Popular</Badge>
                )}
              </div>
              <CardTitle className="text-lg text-breakfast-800">{item.name}</CardTitle>
              <p className="text-sm text-gray-600">{item.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-breakfast-700">
                  ${item.price.toFixed(2)}
                </span>
                <div className="flex items-center space-x-2">
                  {cart[item.id] > 0 && (
                    <span className="text-sm bg-breakfast-100 text-breakfast-800 px-2 py-1 rounded">
                      {cart[item.id]} in cart
                    </span>
                  )}
                  <Button 
                    onClick={() => addToCart(item.id)}
                    size="sm"
                    className="breakfast-gradient text-white"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Menu;

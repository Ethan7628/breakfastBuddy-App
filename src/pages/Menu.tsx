
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface MealItem {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  popular?: boolean;
}

const fetchBreakfastMeals = async (): Promise<MenuItem[]> => {
  const meals: MenuItem[] = [];
  
  // Fetch multiple random meals to get breakfast-related items
  for (let i = 0; i < 12; i++) {
    const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    const data = await response.json();
    const meal: MealItem = data.meals[0];
    
    // Create a menu item from the API data
    const menuItem: MenuItem = {
      id: meal.idMeal,
      name: meal.strMeal,
      description: meal.strInstructions.substring(0, 100) + '...',
      price: Math.random() * 15 + 5, // Random price between $5-20
      category: 'Breakfast Special',
      image: meal.strMealThumb,
      popular: Math.random() > 0.7 // Random popular items
    };
    
    meals.push(menuItem);
  }
  
  return meals;
};

const categories = ['All', 'Breakfast Special', 'Popular'];

const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  
  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['breakfast-meals'],
    queryFn: fetchBreakfastMeals,
  });

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : selectedCategory === 'Popular'
    ? menuItems.filter(item => item.popular)
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600 mx-auto"></div>
          <p className="mt-4 text-breakfast-700">Loading delicious breakfast options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-red-600">
          <p>Sorry, we couldn't load the menu right now. Please try again later.</p>
        </div>
      </div>
    );
  }

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
                <div className="w-20 h-20 mb-2">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
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

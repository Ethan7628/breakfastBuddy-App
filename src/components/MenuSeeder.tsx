import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MealItem {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string;
}

export const MenuSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);

  const seedMenu = async () => {
    setIsSeeding(true);
    
    try {
      const meals: any[] = [];

      // Fetch 18 random meals from TheMealDB
      for (let i = 0; i < 18; i++) {
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
        const data = await response.json();
        const meal: MealItem = data.meals[0];

        meals.push({
          id: meal.idMeal,
          name: meal.strMeal,
          description: meal.strInstructions,
          price: Math.floor(Math.random() * 21000) + 9000, // UGX 9,000 - 30,000
          category: 'Breakfast Special',
          image_url: meal.strMealThumb,
          popular: Math.random() > 0.7
        });
      }

      // Insert meals into Supabase
      const { error } = await supabase
        .from('menu_items')
        .insert(meals);

      if (error) {
        console.error('Error seeding menu:', error);
        toast({
          title: 'Error seeding menu',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Menu seeded successfully!',
          description: `Added ${meals.length} items to the menu`
        });
      }
    } catch (error) {
      console.error('Error seeding menu:', error);
      toast({
        title: 'Error seeding menu',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Database Seeder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This will populate the menu_items table with random breakfast items from TheMealDB API.
          Use this once to initialize the menu.
        </p>
        <Button 
          onClick={seedMenu} 
          disabled={isSeeding}
          className="breakfast-gradient text-white"
        >
          {isSeeding ? 'Seeding...' : 'Seed Menu Items'}
        </Button>
      </CardContent>
    </Card>
  );
};

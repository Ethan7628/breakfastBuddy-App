import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Pencil, Plus, ImageIcon, Loader2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  popular: boolean;
  preparation_time?: string | null;
  ingredients?: string | null;
  created_at: string;
  updated_at?: string;
}

interface MenuFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  preparation_time: string;
  ingredients: string;
  popular: boolean;
  image: File | null;
  imagePreview: string;
}

const CATEGORIES = [
  'Breakfast Special',
  'Lunch',
  'Dinner',
  'Snacks',
  'Beverages',
  'Desserts'
];

const initialFormData: MenuFormData = {
  name: '',
  description: '',
  price: '',
  category: 'Breakfast Special',
  preparation_time: '',
  ingredients: '',
  popular: false,
  image: null,
  imagePreview: ''
};

export const MenuManager = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast({
        title: 'Error loading menu items',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Image too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive'
        });
        return;
      }
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the meal name and price',
        variant: 'destructive'
      });
      return;
    }

    const price = parseInt(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = editingItem?.image_url || null;

      // Upload new image if provided
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }

      const menuData: {
        name: string;
        description: string | null;
        price: number;
        category: string;
        preparation_time: string | null;
        ingredients: string | null;
        popular: boolean;
        image_url: string | null;
      } = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: price,
        category: formData.category,
        preparation_time: formData.preparation_time.trim() || null,
        ingredients: formData.ingredients.trim() || null,
        popular: formData.popular,
        image_url: imageUrl
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(menuData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: 'Menu item updated',
          description: `${formData.name} has been updated successfully`
        });
      } else {
        // Create new item - use type assertion for new columns not yet in generated types
        const { error } = await supabase
          .from('menu_items')
          .insert(menuData as any);

        if (error) throw error;

        toast({
          title: 'Menu item added',
          description: `${formData.name} has been added to the menu`
        });
      }

      // Reset form and refresh list
      setFormData(initialFormData);
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchMenuItems();

    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error saving menu item',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      preparation_time: item.preparation_time || '',
      ingredients: item.ingredients || '',
      popular: item.popular,
      image: null,
      imagePreview: item.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Menu item deleted',
        description: 'The item has been removed from the menu'
      });

      setDeleteConfirmId(null);
      fetchMenuItems();

    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error deleting item',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-600" />
          <p className="mt-2 text-amber-700">Loading menu items...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-800">Menu Management</CardTitle>
          <Button onClick={openAddDialog} className="breakfast-gradient text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add New Meal
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-600 mb-4">
            Manage your menu items. Add new meals with images, prices, and descriptions.
          </p>
          
          {menuItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-amber-200 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-amber-400 mb-4" />
              <h3 className="text-lg font-medium text-amber-800">No menu items yet</h3>
              <p className="text-amber-600 mb-4">Start by adding your first meal to the menu.</p>
              <Button onClick={openAddDialog} className="breakfast-gradient text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add First Meal
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <Card key={item.id} className="overflow-hidden border-amber-200">
                  <div className="aspect-video relative bg-amber-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-amber-300" />
                      </div>
                    )}
                    {item.popular && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-amber-800 truncate">{item.name}</h3>
                    <p className="text-amber-600 text-sm truncate">{item.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-amber-900">
                        UGX {item.price.toLocaleString()}
                      </span>
                      {item.preparation_time && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                          ⏱ {item.preparation_time}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-800">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Meal Image</Label>
              <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 text-center">
                {formData.imagePreview ? (
                  <div className="relative">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-8">
                    <ImageIcon className="h-10 w-10 mx-auto text-amber-400 mb-2" />
                    <span className="text-amber-600">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Meal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Eggs Benedict"
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price (UGX) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 15000"
                required
                min="1"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preparation Time */}
            <div className="space-y-2">
              <Label htmlFor="prepTime">Preparation Time</Label>
              <Input
                id="prepTime"
                value={formData.preparation_time}
                onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: e.target.value }))}
                placeholder="e.g., 15-20 mins"
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <Label htmlFor="ingredients">What it Includes</Label>
              <Textarea
                id="ingredients"
                value={formData.ingredients}
                onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                placeholder="e.g., 2 eggs, bacon, hollandaise sauce, English muffin"
                rows={2}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of the meal..."
                rows={3}
              />
            </div>

            {/* Popular Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="popular">Mark as Popular</Label>
              <Switch
                id="popular"
                checked={formData.popular}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popular: checked }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="breakfast-gradient text-white"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this menu item? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

-- Create menu_items table with authoritative prices
CREATE TABLE public.menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0),
  category TEXT NOT NULL DEFAULT 'Breakfast Special',
  image_url TEXT,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on menu_items (read-only for everyone)
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read menu items
CREATE POLICY "Menu items are viewable by everyone"
  ON public.menu_items
  FOR SELECT
  USING (true);

-- Only admins can manage menu items
CREATE POLICY "Only admins can insert menu items"
  ON public.menu_items
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update menu items"
  ON public.menu_items
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete menu items"
  ON public.menu_items
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
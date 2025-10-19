-- Create cart table in Supabase
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own cart items
CREATE POLICY "Users can view own cart"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own cart items
CREATE POLICY "Users can add to own cart"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update own cart"
ON public.cart_items
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own cart items
CREATE POLICY "Users can delete from own cart"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all cart items
CREATE POLICY "Admins can view all carts"
ON public.cart_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
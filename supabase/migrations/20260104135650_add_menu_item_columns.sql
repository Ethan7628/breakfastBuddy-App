-- Add preparation_time and ingredients columns to menu_items table
ALTER TABLE public.menu_items
ADD COLUMN preparation_time TEXT,
ADD COLUMN ingredients TEXT;
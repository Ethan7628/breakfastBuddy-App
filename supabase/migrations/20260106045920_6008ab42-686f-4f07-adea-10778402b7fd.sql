-- Add payment_gateway_response column to orders table for storing MunoPay transaction details
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB;

-- Add order_reference column for tracking payment references
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_reference TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.payment_gateway_response IS 'Stores payment gateway transaction details including reference and response data';
COMMENT ON COLUMN public.orders.order_reference IS 'Unique order reference used for payment tracking';
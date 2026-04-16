ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS calculated_profit numeric DEFAULT 0;

NOTIFY pgrst, 'reload schema';
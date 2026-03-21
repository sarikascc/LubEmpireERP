-- 1. Materials Table (Handles Raw Materials, Boxes, Stickers, and Caps)
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Raw Material', 'Box', 'Sticker', 'Cap')),
  unit TEXT NOT NULL CHECK (unit IN ('Ltr', 'KG', 'PCS')),
  stock NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Finished Products Table (The catalog of oils you sell)
CREATE TABLE public.finished_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  grade_name TEXT NOT NULL,
  stock NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Containers Table (Bottles & Buckets - The New Packaging System)
CREATE TABLE public.containers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                 
  stock NUMERIC DEFAULT 0,            
  capacity_per_piece NUMERIC NOT NULL,
  capacity_unit TEXT NOT NULL,        
  pieces_per_box NUMERIC NOT NULL DEFAULT 1,
  box_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  cap_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  cap_quantity NUMERIC DEFAULT 0,
  sticker_id UUID NOT NULL REFERENCES public.materials(id),
  sticker_quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT containers_pkey PRIMARY KEY (id)
);

-- 4. Orders Table (Sales & Tracking linked to Containers)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_number SERIAL NOT NULL,
  finished_product_id UUID REFERENCES public.finished_products(id) ON DELETE RESTRICT,
  container_id UUID REFERENCES public.containers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL DEFAULT 'Unknown',
  boxes_quantity INTEGER NOT NULL,
  rate_per_piece NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  outstanding_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- 5. Accounting Entries Table (Income & Expense tracking)
CREATE TABLE public.accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Income', 'Expense')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_id UUID, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Container Transactions Table (Tracks physical empty bottle usage)
CREATE TABLE public.container_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  container_id UUID REFERENCES public.containers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate NUMERIC DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT container_transactions_pkey PRIMARY KEY (id)
);

-- 7. Material Transactions Table (Purchases, usage, adjustments)
CREATE TABLE public.material_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Purchase', 'Manual Add', 'Manual Remove', 'Production Use', 'Order Use')),
  quantity NUMERIC NOT NULL,
  rate NUMERIC, 
  reason TEXT, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
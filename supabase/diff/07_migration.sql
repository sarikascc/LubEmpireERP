-- ==============================================================================
-- MIGRATION 7: ADD AVERAGE COST COLUMNS
-- ==============================================================================

-- 1. Add average cost to Finished Products (The blended cost of producing the oil)
ALTER TABLE public.finished_products 
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0;

-- 2. Add average cost to Containers (The cost of the physical empty bottle/bucket)
ALTER TABLE public.containers 
  ADD COLUMN IF NOT EXISTS cost_per_piece NUMERIC DEFAULT 0;

-- 3. Add average cost to Materials (The cost of Caps, Boxes, Stickers, Raw Materials)
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0;
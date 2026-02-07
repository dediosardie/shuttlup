-- Add month and po_number columns to routes table

-- Add po_number column
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Add month column
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS month DATE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_routes_po_number ON public.routes(po_number);
CREATE INDEX IF NOT EXISTS idx_routes_month ON public.routes(month);

-- Add comment to columns
COMMENT ON COLUMN public.routes.po_number IS 'Purchase Order number for the route';
COMMENT ON COLUMN public.routes.month IS 'Month associated with the route (stored as date, displayed as MMM-YY)';

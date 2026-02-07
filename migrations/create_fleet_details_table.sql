-- Create fleet_details table
CREATE TABLE IF NOT EXISTS public.fleet_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  van_number TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  unit TEXT,
  area TEXT,
  profit_centre TEXT CHECK (profit_centre IN ('Delta', 'Subcon ST')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fleet_details_status ON public.fleet_details(status);
CREATE INDEX IF NOT EXISTS idx_fleet_details_van_number ON public.fleet_details(van_number);
CREATE INDEX IF NOT EXISTS idx_fleet_details_plate_number ON public.fleet_details(plate_number);
CREATE INDEX IF NOT EXISTS idx_fleet_details_driver_name ON public.fleet_details(driver_name);

-- Enable RLS
ALTER TABLE public.fleet_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read fleet_details" ON public.fleet_details;
DROP POLICY IF EXISTS "Allow authenticated users to insert fleet_details" ON public.fleet_details;
DROP POLICY IF EXISTS "Allow authenticated users to update fleet_details" ON public.fleet_details;
DROP POLICY IF EXISTS "Allow authenticated users to delete fleet_details" ON public.fleet_details;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read fleet_details"
  ON public.fleet_details FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert fleet_details"
  ON public.fleet_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update fleet_details"
  ON public.fleet_details FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete fleet_details"
  ON public.fleet_details FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fleet_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fleet_details_timestamp ON public.fleet_details;

CREATE TRIGGER update_fleet_details_timestamp
  BEFORE UPDATE ON public.fleet_details
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_details_updated_at();

-- Grant permissions
GRANT ALL ON public.fleet_details TO authenticated;
GRANT ALL ON public.fleet_details TO service_role;

-- Migration: Create rates table
-- Description: Create rates table for rate management (admin group)
-- Date: 2026-02-07

-- Create rates table
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line SERIAL NOT NULL,
  route TEXT NOT NULL,
  rate NUMERIC(10, 2) NOT NULL CHECK (rate > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on line for sorting
CREATE INDEX IF NOT EXISTS idx_rates_line ON rates(line);

-- Create index on route for searching
CREATE INDEX IF NOT EXISTS idx_rates_route ON rates(route);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rates_updated_at
  BEFORE UPDATE ON rates
  FOR EACH ROW
  EXECUTE FUNCTION update_rates_updated_at();

-- Add comments
COMMENT ON TABLE rates IS 'Rate management for routes (admin group)';
COMMENT ON COLUMN rates.line IS 'Auto-incrementing line number';
COMMENT ON COLUMN rates.route IS 'Route name or description';
COMMENT ON COLUMN rates.rate IS 'Rate for the route in currency';

-- Grant permissions (adjust as needed based on your RLS policies)
-- Enable RLS
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to read rates"
  ON rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert rates"
  ON rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rates"
  ON rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete rates"
  ON rates FOR DELETE
  TO authenticated
  USING (true);

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'rates'
ORDER BY ordinal_position;

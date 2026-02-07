-- Migration: Create routes table
-- Description: Create routes table for maintenance route management
-- Date: 2026-02-07

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lines SERIAL NOT NULL,
  route TEXT NOT NULL,
  part_number TEXT NOT NULL,
  rate NUMERIC(10, 2) NOT NULL CHECK (rate > 0),
  po_qty INTEGER NOT NULL CHECK (po_qty > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on lines for sorting
CREATE INDEX IF NOT EXISTS idx_routes_lines ON routes(lines);

-- Create index on route for searching
CREATE INDEX IF NOT EXISTS idx_routes_route ON routes(route);

-- Create index on part_number for searching
CREATE INDEX IF NOT EXISTS idx_routes_part_number ON routes(part_number);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_routes_updated_at();

-- Add comments
COMMENT ON TABLE routes IS 'Maintenance routes with part numbers and rates';
COMMENT ON COLUMN routes.lines IS 'Auto-incrementing line number';
COMMENT ON COLUMN routes.route IS 'Route name or description';
COMMENT ON COLUMN routes.part_number IS 'Part number associated with the route';
COMMENT ON COLUMN routes.rate IS 'Rate for the route in currency';
COMMENT ON COLUMN routes.po_qty IS 'Purchase order quantity';

-- Grant permissions (adjust as needed based on your RLS policies)
-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to read routes"
  ON routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete routes"
  ON routes FOR DELETE
  TO authenticated
  USING (true);

-- Sample data (optional - remove if not needed)
-- INSERT INTO routes (route, part_number, rate, po_qty) VALUES
--   ('Route A', 'PN-001', 150.00, 10),
--   ('Route B', 'PN-002', 200.50, 15),
--   ('Route C', 'PN-003', 175.75, 20);

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'routes'
ORDER BY ordinal_position;

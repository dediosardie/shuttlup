-- Migration: Create trip_request_passengers junction table
-- Purpose: Link trip requests with multiple passengers from users table
-- Date: 2026-02-08

-- Create the junction table
CREATE TABLE IF NOT EXISTS trip_request_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_request_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
  passenger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_trip_passenger UNIQUE(trip_request_id, passenger_user_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trip_request_passengers_trip_id 
  ON trip_request_passengers(trip_request_id);

CREATE INDEX IF NOT EXISTS idx_trip_request_passengers_user_id 
  ON trip_request_passengers(passenger_user_id);

CREATE INDEX IF NOT EXISTS idx_trip_request_passengers_status 
  ON trip_request_passengers(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_trip_request_passengers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_request_passengers_updated_at
  BEFORE UPDATE ON trip_request_passengers
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_request_passengers_updated_at();

-- Enable Row Level Security
ALTER TABLE trip_request_passengers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to view passenger assignments
CREATE POLICY "Allow authenticated users to view trip passengers"
  ON trip_request_passengers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow requestors and admins to insert passengers
CREATE POLICY "Allow requestors to add passengers"
  ON trip_request_passengers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_requests tr
      WHERE tr.id = trip_request_id
      AND (
        tr.requestor_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role IN ('administration', 'fleet_manager')
        )
      )
    )
  );

-- Allow requestors and admins to update passenger status
CREATE POLICY "Allow requestors to update passengers"
  ON trip_request_passengers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests tr
      WHERE tr.id = trip_request_id
      AND (
        tr.requestor_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role IN ('administration', 'fleet_manager')
        )
      )
    )
  );

-- Allow requestors and admins to delete passenger assignments
CREATE POLICY "Allow requestors to remove passengers"
  ON trip_request_passengers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests tr
      WHERE tr.id = trip_request_id
      AND (
        tr.requestor_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role IN ('administration', 'fleet_manager')
        )
      )
    )
  );

-- Comment on table and columns
COMMENT ON TABLE trip_request_passengers IS 'Junction table linking trip requests with passenger users';
COMMENT ON COLUMN trip_request_passengers.trip_request_id IS 'Reference to the trip request';
COMMENT ON COLUMN trip_request_passengers.passenger_user_id IS 'Reference to the user (passenger) assigned to the trip';
COMMENT ON COLUMN trip_request_passengers.status IS 'Status of passenger participation: pending, confirmed, cancelled';

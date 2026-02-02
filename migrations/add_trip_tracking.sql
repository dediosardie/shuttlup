-- Migration: Add trip location tracking table
-- This table stores GPS coordinates for real-time driver tracking during trips

CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2), -- GPS accuracy in meters
  speed DECIMAL(10, 2), -- Speed in km/h
  heading DECIMAL(5, 2), -- Direction in degrees (0-360)
  altitude DECIMAL(10, 2), -- Altitude in meters
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by trip
CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_id ON trip_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_timestamp ON trip_locations(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read trip locations
CREATE POLICY trip_locations_select_policy ON trip_locations
  FOR SELECT
  USING (true);

-- RLS Policy: All authenticated users can insert trip locations
CREATE POLICY trip_locations_insert_policy ON trip_locations
  FOR INSERT
  WITH CHECK (true);

-- Add tracking_enabled column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_stopped_at TIMESTAMPTZ;

COMMENT ON TABLE trip_locations IS 'Stores GPS location data for real-time trip tracking';
COMMENT ON COLUMN trip_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN trip_locations.speed IS 'Speed in kilometers per hour';
COMMENT ON COLUMN trip_locations.heading IS 'Direction of travel in degrees (0-360)';

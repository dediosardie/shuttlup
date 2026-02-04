-- Create Driver Attendance Table
CREATE TABLE IF NOT EXISTS driver_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('login', 'logout')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_driver_attendance_driver_id ON driver_attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_date ON driver_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_action ON driver_attendance(action_type);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_timestamp ON driver_attendance(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE driver_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can view their own attendance records
CREATE POLICY "Drivers can view own attendance" 
  ON driver_attendance FOR SELECT 
  USING (auth.uid() IN (SELECT id FROM drivers WHERE id = driver_id));

-- Policy: Drivers can insert their own attendance records
CREATE POLICY "Drivers can create own attendance" 
  ON driver_attendance FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM drivers WHERE id = driver_id));

-- Policy: Admins and managers can view all attendance records
CREATE POLICY "Admins can view all attendance" 
  ON driver_attendance FOR SELECT 
  USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'manager')));

-- Policy: Admins can manage all attendance records
CREATE POLICY "Admins can manage attendance" 
  ON driver_attendance FOR ALL 
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER driver_attendance_updated_at
  BEFORE UPDATE ON driver_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_attendance_updated_at();

-- Comments
COMMENT ON TABLE driver_attendance IS 'Tracks driver login/logout attendance with images and location';
COMMENT ON COLUMN driver_attendance.action_type IS 'Type of action: login or logout';
COMMENT ON COLUMN driver_attendance.image_url IS 'URL of the captured image stored in Supabase Storage';
COMMENT ON COLUMN driver_attendance.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN driver_attendance.longitude IS 'GPS longitude coordinate';

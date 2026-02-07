-- Create trip_requests table
CREATE TABLE IF NOT EXISTS public.trip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shuttle_no TEXT NOT NULL,
  requestor TEXT,
  requestor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  reason_shortext TEXT,
  date_requested DATE DEFAULT CURRENT_DATE,
  date_of_service DATE NOT NULL,
  module TEXT,
  arrival_time TIME,
  passenger_name TEXT NOT NULL,
  in_out TEXT,
  address TEXT,
  van_driver TEXT,
  details TEXT,
  van_nos TEXT,
  requestor_confirmed_service TEXT,
  route TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_requestor ON public.trip_requests(requestor);
CREATE INDEX IF NOT EXISTS idx_trip_requests_passenger_name ON public.trip_requests(passenger_name);
CREATE INDEX IF NOT EXISTS idx_trip_requests_date_of_service ON public.trip_requests(date_of_service);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON public.trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_requestor_user_id ON public.trip_requests(requestor_user_id);

-- Enable Row Level Security
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to view all trip requests
CREATE POLICY "Allow users to view all trip requests"
  ON public.trip_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert trip requests
CREATE POLICY "Allow users to create trip requests"
  ON public.trip_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own trip requests
CREATE POLICY "Allow users to update trip requests"
  ON public.trip_requests
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow users to delete trip requests
CREATE POLICY "Allow users to delete trip requests"
  ON public.trip_requests
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_requests_updated_at
  BEFORE UPDATE ON public.trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_requests_updated_at();

-- Grant permissions
GRANT ALL ON public.trip_requests TO authenticated;
GRANT ALL ON public.trip_requests TO service_role;

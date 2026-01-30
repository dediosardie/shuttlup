-- Disable RLS for Custom Authentication
-- Since we're using custom authentication with public.users table,
-- we don't have Supabase Auth context (auth.uid())
-- RLS will be handled at the application level

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_disposal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can modify users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can modify vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and managers can modify vehicles" ON public.vehicles;

DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can modify drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins and managers can modify drivers" ON public.drivers;

DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Authenticated users can modify maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Admins and managers can modify maintenance" ON public.maintenance;

DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can modify trips" ON public.trips;
DROP POLICY IF EXISTS "Admins and managers can modify trips" ON public.trips;

DROP POLICY IF EXISTS "Authenticated users can view fuel_transactions" ON public.fuel_transactions;
DROP POLICY IF EXISTS "Authenticated users can modify fuel_transactions" ON public.fuel_transactions;
DROP POLICY IF EXISTS "Admins and managers can modify fuel_transactions" ON public.fuel_transactions;

DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can modify incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins and managers can modify incidents" ON public.incidents;

DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can modify documents" ON public.documents;
DROP POLICY IF EXISTS "Admins and managers can modify documents" ON public.documents;

DROP POLICY IF EXISTS "Authenticated users can view vehicle_disposal" ON public.vehicle_disposal;
DROP POLICY IF EXISTS "Authenticated users can modify vehicle_disposal" ON public.vehicle_disposal;

DROP POLICY IF EXISTS "Authenticated users can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can modify audit_logs" ON public.audit_logs;

-- Grant permissions to anon role (for custom authentication)
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.vehicles TO anon;
GRANT ALL ON public.drivers TO anon;
GRANT ALL ON public.maintenance TO anon;
GRANT ALL ON public.trips TO anon;
GRANT ALL ON public.fuel_transactions TO anon;
GRANT ALL ON public.incidents TO anon;
GRANT ALL ON public.documents TO anon;
GRANT ALL ON public.vehicle_disposal TO anon;
GRANT ALL ON public.audit_logs TO anon;

-- Also grant to authenticated role for compatibility
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.vehicles TO authenticated;
GRANT ALL ON public.drivers TO authenticated;
GRANT ALL ON public.maintenance TO authenticated;
GRANT ALL ON public.trips TO authenticated;
GRANT ALL ON public.fuel_transactions TO authenticated;
GRANT ALL ON public.incidents TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.vehicle_disposal TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;

-- Note: Security is now handled at the application level
-- Make sure to validate user sessions before performing operations

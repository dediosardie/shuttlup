-- Add Fleet Details page restriction
-- This page should be accessible to fleet managers, administration, and maintenance team

INSERT INTO public.page_restrictions (
  page_path,
  page_name,
  fleet_manager_access,
  maintenance_team_access,
  administration_access,
  driver_access,
  passenger_access
)
VALUES (
  '/fleet-details',
  'Fleet Details',
  true,    -- fleet_manager_access
  true,    -- maintenance_team_access
  true,    -- administration_access
  false,   -- driver_access
  false    -- passenger_access
)
ON CONFLICT (page_path) DO UPDATE
SET
  page_name = EXCLUDED.page_name,
  fleet_manager_access = EXCLUDED.fleet_manager_access,
  maintenance_team_access = EXCLUDED.maintenance_team_access,
  administration_access = EXCLUDED.administration_access,
  driver_access = EXCLUDED.driver_access,
  passenger_access = EXCLUDED.passenger_access;

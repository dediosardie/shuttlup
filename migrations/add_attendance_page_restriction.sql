-- Add Attendance page to page_restrictions table
-- This allows drivers to access the Driver Attendance page

INSERT INTO page_restrictions (
  page_name, 
  page_path, 
  description, 
  fleet_manager_access, 
  maintenance_team_access, 
  driver_access, 
  administration_access, 
  client_company_liaison_access,
  is_active
)
VALUES (
  'Driver Attendance', 
  '/attendance', 
  'Driver check-in/check-out with photo capture and GPS tracking', 
  true,  -- fleet_manager can access
  false, -- maintenance_team cannot access
  true,  -- driver can access
  true,  -- administration can access
  false, -- client_company_liaison cannot access
  true   -- is_active
)
ON CONFLICT (page_name) 
DO UPDATE SET
  page_path = EXCLUDED.page_path,
  description = EXCLUDED.description,
  fleet_manager_access = EXCLUDED.fleet_manager_access,
  maintenance_team_access = EXCLUDED.maintenance_team_access,
  driver_access = EXCLUDED.driver_access,
  administration_access = EXCLUDED.administration_access,
  client_company_liaison_access = EXCLUDED.client_company_liaison_access,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the insertion
SELECT page_name, page_path, driver_access, fleet_manager_access, administration_access, is_active 
FROM page_restrictions 
WHERE page_path = '/attendance';

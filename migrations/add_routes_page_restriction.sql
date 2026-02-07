-- Migration: Add Routes page to page_restrictions
-- Description: Add routes page with maintenance team access
-- Date: 2026-02-07

-- Insert Routes page into page_restrictions
INSERT INTO page_restrictions (
  page_name, 
  page_path, 
  is_active,
  fleet_manager_access,
  maintenance_team_access,
  driver_access,
  passenger_access,
  administration_access,
  client_company_liaison_access
) VALUES (
  'Routes',
  '/routes',
  true,
  true,   -- Fleet managers can manage routes
  true,   -- Maintenance team can manage routes
  false,  -- Drivers don't need access
  false,  -- Passengers don't need access
  true,   -- Administration can manage routes
  false   -- Client liaisons don't need access
)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  is_active = EXCLUDED.is_active,
  fleet_manager_access = EXCLUDED.fleet_manager_access,
  maintenance_team_access = EXCLUDED.maintenance_team_access,
  administration_access = EXCLUDED.administration_access;

-- Verify the insertion
SELECT 
  page_name, 
  page_path, 
  is_active,
  fleet_manager_access,
  maintenance_team_access,
  administration_access
FROM page_restrictions 
WHERE page_path = '/routes';

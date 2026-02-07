-- Migration: Add Trip Request and Booking Request pages
-- Description: Add new pages for trip and booking requests with default access
-- Date: 2026-02-07

-- Insert Trip Request page
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
  'Trip Request',
  '/trip-request',
  true,
  false,
  false,
  false,
  true,  -- Allow passengers to request trips
  false,
  false
)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  is_active = EXCLUDED.is_active;

-- Insert Booking Request page
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
  'Booking Request',
  '/booking-request',
  true,
  false,
  false,
  false,
  true,  -- Allow passengers to make booking requests
  false,
  false
)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  is_active = EXCLUDED.is_active;

-- Verify the insertions
SELECT 
  page_name, 
  page_path, 
  is_active,
  passenger_access
FROM page_restrictions 
WHERE page_path IN ('/trip-request', '/booking-request')
ORDER BY page_name;

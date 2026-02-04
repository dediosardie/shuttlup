-- Add Attendance page to page_restrictions table
-- This allows roles to access the Driver Attendance page

INSERT INTO page_restrictions (page_path, page_name, allowed_roles, is_active)
VALUES 
  ('/attendance', 'Driver Attendance', ARRAY['fleet_manager', 'driver', 'administration']::text[], true)
ON CONFLICT (page_path) 
DO UPDATE SET
  page_name = EXCLUDED.page_name,
  allowed_roles = EXCLUDED.allowed_roles,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE page_restrictions IS 'Controls page access for different user roles. Updated to include Driver Attendance page.';

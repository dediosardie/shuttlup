-- Fix Invalid User Roles
-- This script diagnoses and fixes users with invalid roles

-- ============================================================================
-- STEP 1: Check current users and their roles
-- ============================================================================
SELECT 
  email, 
  role, 
  is_active,
  CASE 
    WHEN role IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison') 
    THEN '✓ VALID'
    ELSE '✗ INVALID - Needs update'
  END as role_status
FROM users
ORDER BY email;

-- ============================================================================
-- STEP 2: Update any users with 'viewer' role to 'administration'
-- (You can change 'administration' to any valid role you prefer)
-- ============================================================================
UPDATE users
SET role = 'administration'
WHERE role = 'viewer'
RETURNING email, role as new_role;

-- ============================================================================
-- STEP 3: Update any other invalid roles
-- ============================================================================
UPDATE users
SET role = 'driver'
WHERE role NOT IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison')
  AND role != 'viewer' -- Already handled above
RETURNING email, role as new_role;

-- ============================================================================
-- STEP 4: Update the create_user_account function to use valid default role
-- ============================================================================
CREATE OR REPLACE FUNCTION create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'driver', -- Changed from 'viewer' to 'driver'
  p_is_active BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM users WHERE users.email = p_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison') THEN
    RAISE EXCEPTION 'Invalid role. Must be one of: fleet_manager, maintenance_team, driver, administration, client_company_liaison';
  END IF;

  -- Insert new user with hashed password
  INSERT INTO users (email, password_hash, full_name, role, is_active)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    p_is_active
  )
  RETURNING users.id INTO v_user_id;

  -- Return the created user (without password_hash)
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM users u
  WHERE u.id = v_user_id;
END;
$$;

-- ============================================================================
-- STEP 5: Verify all users now have valid roles
-- ============================================================================
SELECT 
  email, 
  role,
  is_active,
  '✓ All roles should be valid now' as status
FROM users
ORDER BY email;

-- ============================================================================
-- HELPFUL COMMANDS
-- ============================================================================

-- To manually update a specific user's role:
-- UPDATE users SET role = 'administration' WHERE email = 'admin@dentistahub.com';

-- To create a new admin user with correct role:
-- SELECT create_user_account('admin@example.com', 'password123', 'Admin User', 'administration', true);

-- Valid roles:
-- - fleet_manager
-- - maintenance_team  
-- - driver
-- - administration
-- - client_company_liaison

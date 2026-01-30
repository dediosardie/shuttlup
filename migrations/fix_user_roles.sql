-- Fix User Roles Migration
-- Updates user table to match RBAC role definitions

-- Step 1: Update the users table constraint to use correct roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison'));

-- Step 2: Migrate existing user roles to new role names
UPDATE users SET role = 'fleet_manager' WHERE role = 'admin';
UPDATE users SET role = 'maintenance_team' WHERE role = 'maintenance_manager';
UPDATE users SET role = 'administration' WHERE role = 'viewer';

-- Step 3: If you have any remaining unmapped roles, update them
-- Uncomment and modify as needed:
-- UPDATE users SET role = 'administration' WHERE role = 'some_old_role';

-- Step 4: Verify all users have valid roles
SELECT email, role FROM users ORDER BY role;

-- Step 5: Update any users without valid roles (if needed)
-- UPDATE users SET role = 'driver' WHERE role NOT IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison');

-- Comments
COMMENT ON COLUMN users.role IS 'User role: fleet_manager, maintenance_team, driver, administration, or client_company_liaison';

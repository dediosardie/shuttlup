-- Migration: Sync password changes from auth.users to public.users
-- Created: 2026-02-09
-- Description: Trigger to automatically sync password changes made via Supabase Auth

-- Create function to sync password updates from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_auth_password_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if password actually changed
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Update public.users with a marker and timestamp
    UPDATE public.users
    SET 
      password_hash = NEW.encrypted_password,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    -- Clear any active sessions to force re-login
    UPDATE public.users
    SET 
      session_id = NULL,
      session_expires_at = NULL
    WHERE id = NEW.id;
    
    RAISE LOG 'Password synced from auth.users to public.users for user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to catch password updates
DROP TRIGGER IF EXISTS sync_password_to_public ON auth.users;

CREATE TRIGGER sync_password_to_public
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_password_to_public();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_auth_password_to_public() TO postgres, service_role;

-- Add comment
COMMENT ON FUNCTION sync_auth_password_to_public IS 'Syncs password changes from auth.users to public.users automatically';

-- Test query (optional - run after migration)
/*
-- Verify trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_password_to_public';

-- Test password update (replace with real user ID)
-- This should automatically update public.users
UPDATE auth.users
SET encrypted_password = crypt('testpassword123', gen_salt('bf'))
WHERE email = 'test@example.com';

-- Check if both tables are in sync
SELECT 
  au.id,
  au.email,
  au.encrypted_password IS NOT NULL as auth_has_password,
  u.password_hash IS NOT NULL as public_has_password,
  au.updated_at as auth_updated,
  u.updated_at as public_updated
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email = 'test@example.com';
*/

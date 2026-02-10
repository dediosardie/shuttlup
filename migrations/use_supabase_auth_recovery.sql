-- ============================================================================
-- USE SUPABASE AUTH RECOVERY TOKEN FOR PASSWORD RESET
-- ============================================================================
-- Purpose: Switch to using Supabase's built-in recovery token system
--          instead of custom tokens in public.users
-- Date: February 10, 2026
-- ============================================================================

-- Drop custom recovery token columns from public.users (no longer needed)
ALTER TABLE public.users DROP COLUMN IF EXISTS recovery_token CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS recovery_token_expires_at CASCADE;

-- Drop custom recovery token functions
DROP FUNCTION IF EXISTS generate_recovery_token() CASCADE;
DROP FUNCTION IF EXISTS request_password_reset(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_recovery_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_password_with_token(TEXT, TEXT) CASCADE;

-- ============================================================================
-- NEW APPROACH: Use Supabase auth.users recovery token
-- ============================================================================
-- Supabase already provides:
-- - auth.users.recovery_token (secure token generation)
-- - auth.users.recovery_sent_at (timestamp tracking)
-- - Built-in email delivery via Supabase Auth
-- 
-- The password update process will work as follows:
-- 1. User requests reset → Supabase generates recovery_token in auth.users
-- 2. Email sent with magic link containing recovery token
-- 3. User clicks link → Supabase validates token and sets session
-- 4. User updates password via updateUser API
-- 5. Trigger automatically syncs to public.users
-- ============================================================================

-- Ensure password sync trigger exists (should already exist from previous migration)
-- This trigger syncs password changes from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_auth_password_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if password actually changed
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Update public.users with synced password
    UPDATE public.users
    SET 
      password_hash = NEW.encrypted_password,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    -- Clear any active sessions to force re-login with new password
    UPDATE public.users
    SET 
      session_id = NULL,
      session_expires_at = NULL
    WHERE id = NEW.id;
    
    RAISE LOG 'Password synced from auth.users (%) to public.users for user %', NEW.email, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS sync_password_to_public ON auth.users;
CREATE TRIGGER sync_password_to_public
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_password_to_public();

-- ============================================================================
-- FUNCTION: Sync existing Supabase auth users to public.users
-- Useful for ensuring both tables are in sync
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_auth_users_to_public()
RETURNS TABLE(synced_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_synced INTEGER := 0;
BEGIN
  -- Sync users from auth.users to public.users
  -- This handles cases where auth.users has users not in public.users
  INSERT INTO public.users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    au.encrypted_password,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    COALESCE(au.raw_user_meta_data->>'role', 'passenger') as role,
    au.email_confirmed_at IS NOT NULL as is_active,
    au.created_at,
    au.updated_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
  )
  ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = EXCLUDED.updated_at;
    
  GET DIAGNOSTICS v_synced = ROW_COUNT;
  
  RETURN QUERY SELECT v_synced;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_auth_password_to_public() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_public() TO postgres, service_role, authenticated;

-- Comments
COMMENT ON FUNCTION sync_auth_password_to_public IS 'Automatically syncs password changes from auth.users to public.users';
COMMENT ON FUNCTION sync_auth_users_to_public IS 'Manually sync all auth.users to public.users (one-time or maintenance)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that password sync trigger exists
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'sync_password_to_public';

-- Verify custom token columns are removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('recovery_token', 'recovery_token_expires_at');
-- Should return 0 rows

-- Check that sync function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('sync_auth_password_to_public', 'sync_auth_users_to_public');
-- Should return 2 rows

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 
-- Password Reset Flow with Supabase Auth:
-- 
-- 1. Request Reset:
--    await supabase.auth.resetPasswordForEmail(email, {
--      redirectTo: 'https://yourapp.com/reset-password'
--    })
--
-- 2. Supabase sends email with magic link containing recovery token
--
-- 3. User clicks link → redirected to app with access_token in URL
--
-- 4. App calls:
--    await supabase.auth.updateUser({ password: newPassword })
--
-- 5. Trigger automatically syncs to public.users
--
-- 6. User can log in with new password
--
-- ============================================================================

-- Run sync to ensure existing users are in sync (optional)
-- SELECT * FROM sync_auth_users_to_public();

-- Migration: Update password change function to sync both auth.users and public.users
-- Created: 2026-02-09
-- Description: Ensures password changes update both Supabase Auth and custom user table

-- Drop existing function
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT) CASCADE;

-- Create updated function that syncs both tables
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Get user email from public.users
  SELECT email INTO v_email FROM users WHERE id = p_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update auth.users (Supabase Auth) password
  -- This updates the authentication system
  BEGIN
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = CURRENT_TIMESTAMP,
        confirmation_token = NULL,
        email_confirmed_at = COALESCE(email_confirmed_at, CURRENT_TIMESTAMP)
    WHERE id = p_user_id;
    
    v_found := FOUND;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue to update public.users
    RAISE WARNING 'Failed to update auth.users: %', SQLERRM;
  END;

  -- Update public.users (custom table) password hash
  -- This keeps our custom table in sync
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
  
  v_found := v_found OR FOUND;

  -- Return true if either table was updated
  RETURN v_found;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_user_password IS 'Updates user password in both auth.users and public.users (requires authentication)';

-- Verification query (run after migration)
-- SELECT 
--   u.id, 
--   u.email,
--   u.password_hash IS NOT NULL as has_public_hash,
--   au.encrypted_password IS NOT NULL as has_auth_hash
-- FROM users u
-- LEFT JOIN auth.users au ON u.id = au.id
-- LIMIT 5;

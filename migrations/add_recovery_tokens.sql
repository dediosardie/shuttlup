-- ============================================================================
-- ADD RECOVERY TOKEN SYSTEM FOR PASSWORD RESET
-- ============================================================================
-- Purpose: Add custom password recovery token system since Supabase auth
--          password reset is not working reliably
-- Date: February 10, 2026
-- ============================================================================

-- Drop existing functions if they exist (for clean re-run)
DROP FUNCTION IF EXISTS reset_password_with_token(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_recovery_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS request_password_reset(TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_recovery_token() CASCADE;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_users_recovery_token CASCADE;
DROP INDEX IF EXISTS idx_users_recovery_token_expires CASCADE;

-- Add recovery token columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS recovery_token TEXT,
ADD COLUMN IF NOT EXISTS recovery_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index on recovery token for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_recovery_token ON users(recovery_token);
CREATE INDEX IF NOT EXISTS idx_users_recovery_token_expires ON users(recovery_token_expires_at);

-- Create function to generate secure random token
CREATE OR REPLACE FUNCTION generate_recovery_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to request password reset (generates token)
CREATE OR REPLACE FUNCTION request_password_reset(user_email TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  token TEXT,
  user_id UUID,
  full_name TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_recovery_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_active BOOLEAN;
BEGIN
  -- Check if user exists and is active
  SELECT u.id, u.full_name, u.is_active 
  INTO v_user_id, v_user_name, v_is_active
  FROM users u
  WHERE u.email = user_email;
  
  IF v_user_id IS NULL THEN
    -- Don't reveal if email exists (security best practice)
    RETURN QUERY SELECT 
      true, 
      'If this email exists, a password reset link will be sent.'::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;
  
  IF NOT v_is_active THEN
    RETURN QUERY SELECT 
      false, 
      'Account is not active. Please contact administrator.'::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Generate token and expiration (1 hour from now)
  v_recovery_token := generate_recovery_token();
  v_expires_at := NOW() + INTERVAL '1 hour';
  
  -- Update user with recovery token
  UPDATE users 
  SET 
    recovery_token = v_recovery_token,
    recovery_token_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Return success with token (will be used to send email)
  RETURN QUERY SELECT 
    true,
    'Password reset token generated successfully.'::TEXT,
    v_recovery_token,
    v_user_id,
    v_user_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate recovery token
CREATE OR REPLACE FUNCTION validate_recovery_token(token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find user with matching token
  SELECT u.id, u.email, u.full_name, u.recovery_token_expires_at
  INTO v_user_id, v_email, v_full_name, v_expires_at
  FROM users u
  WHERE u.recovery_token = token;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      'Invalid recovery token.'::TEXT;
    RETURN;
  END IF;
  
  IF v_expires_at < NOW() THEN
    -- Clear expired token
    UPDATE users 
    SET recovery_token = NULL, recovery_token_expires_at = NULL
    WHERE id = v_user_id;
    
    RETURN QUERY SELECT 
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      'Recovery token has expired. Please request a new password reset.'::TEXT;
    RETURN;
  END IF;
  
  -- Token is valid
  RETURN QUERY SELECT 
    true,
    v_user_id,
    v_email,
    v_full_name,
    'Token is valid.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset password with token
CREATE OR REPLACE FUNCTION reset_password_with_token(
  token TEXT,
  new_password_hash TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_is_valid BOOLEAN;
BEGIN
  -- Validate token first
  SELECT valid, user_id 
  INTO v_is_valid, v_user_id
  FROM validate_recovery_token(token);
  
  IF NOT v_is_valid OR v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false,
      'Invalid or expired recovery token.'::TEXT;
    RETURN;
  END IF;
  
  -- Update password in public.users and clear token
  UPDATE users 
  SET 
    password_hash = new_password_hash,
    recovery_token = NULL,
    recovery_token_expires_at = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- CRITICAL: Also update in auth.users for Supabase Auth login to work
  -- Supabase Auth uses auth.users.encrypted_password for login validation
  UPDATE auth.users
  SET 
    encrypted_password = new_password_hash,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RETURN QUERY SELECT 
    true,
    'Password has been reset successfully.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_recovery_token() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_recovery_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_password_with_token(TEXT, TEXT) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test that columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('recovery_token', 'recovery_token_expires_at');

-- Test that functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%recovery%' OR routine_name LIKE '%reset_password%';

COMMENT ON COLUMN users.recovery_token IS 'Secure token for password reset - expires after 1 hour';
COMMENT ON COLUMN users.recovery_token_expires_at IS 'Expiration timestamp for recovery token';
COMMENT ON FUNCTION request_password_reset(TEXT) IS 'Generates recovery token and returns data needed to send reset email';
COMMENT ON FUNCTION validate_recovery_token(TEXT) IS 'Validates recovery token and returns user information if valid';
COMMENT ON FUNCTION reset_password_with_token(TEXT, TEXT) IS 'Resets password using valid recovery token';

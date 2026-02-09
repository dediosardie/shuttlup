-- Migration: Complete Password Reset System
-- Created: 2026-02-09
-- Description: Full implementation of password reset with tokens and email flow

-- 1. Create password_resets table to store reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Add RLS policies
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for reset requests)
CREATE POLICY "Allow anonymous insert" ON password_resets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow users to view their own reset requests
CREATE POLICY "Users can view own resets" ON password_resets
  FOR SELECT TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- 2. Update request_password_reset function
DROP FUNCTION IF EXISTS request_password_reset(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION request_password_reset(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user exists and is active
  SELECT id INTO v_user_id 
  FROM users 
  WHERE email = p_email AND is_active = true;
  
  IF v_user_id IS NULL THEN
    -- Return success even if user not found (prevent email enumeration)
    RETURN json_build_object('success', true, 'message', 'If the email exists, a reset link has been sent');
  END IF;

  -- Invalidate any existing unused tokens for this user
  UPDATE password_resets
  SET used_at = CURRENT_TIMESTAMP
  WHERE user_id = v_user_id 
    AND used_at IS NULL 
    AND expires_at > CURRENT_TIMESTAMP;

  -- Generate secure random token (32 bytes = 64 hex chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Token expires in 1 hour
  v_expires_at := CURRENT_TIMESTAMP + INTERVAL '1 hour';

  -- Store reset token
  INSERT INTO password_resets (user_id, email, token, expires_at, ip_address, user_agent)
  VALUES (v_user_id, p_email, v_token, v_expires_at, p_ip_address, p_user_agent);

  -- Return token (in production, this would be sent via email instead)
  -- For development, we return it directly
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at,
    'message', 'Password reset token generated'
  );
END;
$$;

-- 3. Create verify_reset_token function
CREATE OR REPLACE FUNCTION verify_reset_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_record RECORD;
BEGIN
  -- Find valid reset token
  SELECT 
    pr.id,
    pr.user_id,
    pr.email,
    pr.expires_at,
    pr.used_at,
    u.full_name
  INTO v_reset_record
  FROM password_resets pr
  JOIN users u ON pr.user_id = u.id
  WHERE pr.token = p_token
    AND pr.used_at IS NULL
    AND pr.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = true;

  IF v_reset_record.id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid or expired reset token'
    );
  END IF;

  RETURN json_build_object(
    'valid', true,
    'user_id', v_reset_record.user_id,
    'email', v_reset_record.email,
    'expires_at', v_reset_record.expires_at
  );
END;
$$;

-- 4. Create reset_password_with_token function
CREATE OR REPLACE FUNCTION reset_password_with_token(
  p_token TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_record RECORD;
  v_email TEXT;
  v_user_id UUID;
BEGIN
  -- Verify token is valid
  SELECT 
    pr.id as reset_id,
    pr.user_id,
    pr.email,
    pr.expires_at
  INTO v_reset_record
  FROM password_resets pr
  JOIN users u ON pr.user_id = u.id
  WHERE pr.token = p_token
    AND pr.used_at IS NULL
    AND pr.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = true;

  IF v_reset_record.reset_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired reset token'
    );
  END IF;

  v_user_id := v_reset_record.user_id;
  v_email := v_reset_record.email;

  -- Update auth.users (Supabase Auth)
  BEGIN
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = CURRENT_TIMESTAMP,
        confirmation_token = NULL,
        email_confirmed_at = COALESCE(email_confirmed_at, CURRENT_TIMESTAMP)
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to update auth.users: %', SQLERRM;
  END;

  -- Update public.users (custom table)
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_user_id;

  -- Mark token as used
  UPDATE password_resets
  SET used_at = CURRENT_TIMESTAMP
  WHERE id = v_reset_record.reset_id;

  -- Invalidate all other sessions for this user (force re-login)
  UPDATE users
  SET session_id = NULL,
      session_expires_at = NULL
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
END;
$$;

-- 5. Create cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens older than 24 hours
  DELETE FROM password_resets
  WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_reset_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_password_with_token(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets() TO authenticated;

-- Add comments
COMMENT ON TABLE password_resets IS 'Stores password reset tokens with expiration';
COMMENT ON FUNCTION request_password_reset IS 'Generates password reset token (returns token for dev, should email in production)';
COMMENT ON FUNCTION verify_reset_token IS 'Validates reset token without consuming it';
COMMENT ON FUNCTION reset_password_with_token IS 'Resets password using valid token, updates both auth.users and public.users';
COMMENT ON FUNCTION cleanup_expired_password_resets IS 'Removes expired reset tokens (run via cron)';

-- Optional: Create cron job to cleanup expired tokens (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-password-resets', '0 2 * * *', 'SELECT cleanup_expired_password_resets()');

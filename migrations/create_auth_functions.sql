-- Database functions for custom authentication
-- These replace Supabase Auth with public.users table authentication

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- FUNCTION: authenticate_user
-- Authenticates a user by email and password
-- Returns user record if credentials are valid
-- ============================================================================
CREATE OR REPLACE FUNCTION authenticate_user(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  session_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.session_id
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

-- ============================================================================
-- FUNCTION: create_user_account
-- Creates a new user account with hashed password
-- ============================================================================
CREATE OR REPLACE FUNCTION create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'viewer',
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
-- FUNCTION: update_user_password
-- Updates a user's password in BOTH auth.users AND public.users
-- This ensures complete sync between Supabase Auth and custom auth tables
-- ============================================================================
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

-- ============================================================================
-- FUNCTION: request_password_reset
-- Initiates password reset process (simplified version)
-- In production, this would generate a token and send email
-- ============================================================================
CREATE OR REPLACE FUNCTION request_password_reset(
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    -- Return true anyway to prevent email enumeration
    RETURN TRUE;
  END IF;

  -- In a real implementation, you would:
  -- 1. Generate a reset token
  -- 2. Store it in a password_resets table with expiry
  -- 3. Send an email with the reset link
  
  -- For now, just return success
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- Allow authenticated and anonymous users to call these functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user_account(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION authenticate_user IS 'Authenticates user with email and password, returns user data if valid';
COMMENT ON FUNCTION create_user_account IS 'Creates new user account with hashed password';
COMMENT ON FUNCTION update_user_password IS 'Updates user password (requires authentication)';
COMMENT ON FUNCTION request_password_reset IS 'Initiates password reset process';

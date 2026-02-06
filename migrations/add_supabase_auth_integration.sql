-- Migration: Add Supabase Auth Integration
-- Description: Create function to insert user with specific UUID from Supabase Auth
-- Date: 2026-02-06

-- Create function to insert user with a specific UUID (from Supabase Auth)
CREATE OR REPLACE FUNCTION create_user_with_auth_id(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'driver',
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
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM users WHERE users.email = p_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  -- Check if user ID already exists
  IF EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RAISE EXCEPTION 'User ID already exists';
  END IF;

  -- Insert user with specific UUID from Supabase Auth
  INSERT INTO users (id, email, password_hash, full_name, role, is_active)
  VALUES (
    p_user_id,  -- Use the provided UUID from Supabase Auth
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    p_is_active
  );

  -- Return the created user
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM users u
  WHERE u.id = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_with_auth_id(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION create_user_with_auth_id IS 'Creates new user account with specific UUID from Supabase Auth and hashed password';

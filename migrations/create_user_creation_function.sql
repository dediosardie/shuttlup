-- Create a function to handle user creation with proper permissions
-- This allows creating auth users without needing service role key in frontend

-- Drop function if exists
DROP FUNCTION IF EXISTS create_user_with_auth(text, text, text, text, boolean);

-- Create function that runs with security definer (elevated privileges)
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'user',
  p_is_active boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with owner privileges
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate UUID for new user
  v_user_id := gen_random_uuid();
  
  -- Hash the password using crypt extension
  v_encrypted_password := crypt(p_password, gen_salt('bf'));
  
  -- Insert into auth.users (requires superuser or service role)
  -- Note: This approach still requires service role access
  -- Alternative: Use Supabase auth.signUp from client side
  
  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, role, is_active, password_hash)
  VALUES (v_user_id, p_email, p_full_name, p_role, p_is_active, v_encrypted_password);
  
  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION create_user_with_auth(text, text, text, text, boolean) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_user_with_auth IS 'Creates a new user with authentication. Requires admin role in application layer.';

-- Note: This function creates users in public.users but NOT in auth.users
-- You still need to use supabase.auth.signUp() for actual authentication
-- This is a limitation of Supabase - only service role can create auth users programmatically

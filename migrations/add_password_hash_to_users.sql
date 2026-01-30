-- Add password_hash column to users table for custom authentication
-- This replaces Supabase Auth with database-based authentication

-- Add password_hash column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for faster email lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comment
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for authentication';

-- Note: Existing users will need to have their passwords reset
-- You can set a default password hash or require password reset on first login

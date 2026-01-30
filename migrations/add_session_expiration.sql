-- Migration: Add session expiration support
-- Description: Adds session_expires_at column to track session expiration time

-- Add session_expires_at column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

-- Create index for faster session expiration queries
CREATE INDEX IF NOT EXISTS idx_users_session_expires_at 
ON public.users(session_expires_at) 
WHERE session_expires_at IS NOT NULL;

-- Create index for session validation (compound index)
CREATE INDEX IF NOT EXISTS idx_users_session_validation
ON public.users(id, session_id, session_expires_at)
WHERE session_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.session_expires_at IS 'Timestamp when the user session expires';

-- Clean up expired sessions (optional maintenance)
-- This can be run periodically or set up as a cron job
UPDATE public.users
SET session_id = NULL,
    session_expires_at = NULL
WHERE session_expires_at < NOW()
  AND session_id IS NOT NULL;

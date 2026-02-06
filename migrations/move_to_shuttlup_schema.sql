-- Migration: Setup shuttlup schema for new installation
-- Description: Create shuttlup schema and grant permissions
-- Date: 2026-02-06

-- Step 1: Create shuttlup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS shuttlup;

-- Step 2: Grant usage on schema
GRANT USAGE ON SCHEMA shuttlup TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA shuttlup TO postgres;

-- Step 3: Set default search path for current session
SET search_path TO shuttlup, public;

-- Step 4: Grant permissions on all tables in shuttlup schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shuttlup TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA shuttlup TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA shuttlup TO authenticated, anon;

-- Step 5: Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA shuttlup GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shuttlup GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shuttlup GRANT USAGE, SELECT ON SEQUENCES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shuttlup GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;

-- Step 6: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- Verification query (run this to verify the schema is ready)
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'shuttlup';

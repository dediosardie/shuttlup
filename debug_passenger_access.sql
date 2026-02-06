-- Debug script for passenger access issues
-- Run this in your Supabase SQL Editor to troubleshoot

-- 1. Check if passenger_access column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'page_restrictions' 
AND column_name = 'passenger_access';

-- 2. Check what pages have passenger_access enabled
SELECT page_name, page_path, passenger_access, is_active 
FROM page_restrictions 
WHERE passenger_access = true;

-- 3. Check the trips page specifically
SELECT * 
FROM page_restrictions 
WHERE page_path = '/trips';

-- 4. Check if there are any passenger users in the system
SELECT id, email, role, is_active 
FROM users 
WHERE role = 'passenger';

-- 5. If passenger_access column doesn't exist, add it:
-- ALTER TABLE page_restrictions 
-- ADD COLUMN IF NOT EXISTS passenger_access BOOLEAN DEFAULT false;

-- 6. If trips page doesn't have passenger_access, grant it:
-- UPDATE page_restrictions 
-- SET passenger_access = true 
-- WHERE page_path = '/trips';

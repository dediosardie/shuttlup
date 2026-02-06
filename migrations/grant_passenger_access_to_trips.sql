-- Migration: Grant passenger access to trips page
-- Description: Enable passenger_access for trips page so passengers can view trips
-- Date: 2026-02-06

-- Update the trips page to allow passenger access
UPDATE page_restrictions 
SET passenger_access = true 
WHERE page_path = '/trips';

-- Verify the update
SELECT page_name, page_path, passenger_access 
FROM page_restrictions 
WHERE page_path = '/trips';

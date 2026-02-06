-- Migration: Add passenger_access to page_restrictions
-- Description: Add passenger_access column for new passenger user type
-- Date: 2026-02-06

-- Add passenger_access column to page_restrictions table
ALTER TABLE page_restrictions 
ADD COLUMN IF NOT EXISTS passenger_access BOOLEAN DEFAULT false;

-- Update existing records to set passenger_access to false (default)
UPDATE page_restrictions 
SET passenger_access = false 
WHERE passenger_access IS NULL;

-- Add comment
COMMENT ON COLUMN page_restrictions.passenger_access IS 'Whether passengers have access to this page';

# Passenger Access Troubleshooting Guide

## Issue
Passenger users are getting "access denied" errors even though `passenger_access` is set to `true` in the database.

## Root Cause Analysis

The code has been properly updated with:
1. ✅ `passenger_access` column mapping in `pageRestrictionService.ts` 
2. ✅ Default redirect to `/trips` in `roleRedirects.ts`
3. ✅ Migrations to add column and grant access

However, the migrations need to be **executed** in your Supabase database.

## Steps to Fix

### Step 1: Verify Database State
Run the debug script in your Supabase SQL Editor:

```bash
# Use the debug script
d:\Projects\shuttlup\debug_passenger_access.sql
```

Or run these queries directly:

```sql
-- Check if passenger_access column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'page_restrictions' 
AND column_name = 'passenger_access';

-- Check what pages allow passenger access
SELECT page_name, page_path, passenger_access, is_active 
FROM page_restrictions 
WHERE passenger_access = true;

-- Check the trips page specifically
SELECT * FROM page_restrictions WHERE page_path = '/trips';
```

### Step 2: Execute Migrations (if not done)

If the column doesn't exist, run:

```sql
-- Migration 1: Add passenger_access column
ALTER TABLE page_restrictions 
ADD COLUMN IF NOT EXISTS passenger_access BOOLEAN DEFAULT false;

-- Migration 2: Grant passenger access to trips
UPDATE page_restrictions 
SET passenger_access = true 
WHERE page_path = '/trips';
```

### Step 3: Verify Application Logs

Open your browser's Developer Console (F12) and look for these logs:

#### On Page Load:
```
🔍 [usePageAccess] Loading page access for role: passenger
🔍 [usePageAccess] Accessible pages from database: [array of pages]
✓ [usePageAccess] Added page: /trips (Trips)
```

#### On Navigation:
```
🔍 [hasPageAccess] Checking path: /trips, result: true
✓ [checkRoleAccess] Access granted to /trips for role passenger
```

#### If Access Denied:
```
⚠️ Page "/trips" not found in page_restrictions. Access denied.
⚠️ [checkRoleAccess] Access denied to /trips for role passenger
```

### Step 4: Common Issues

#### Issue 1: Column Exists but No Access
**Symptom:** Console shows `Accessible pages from database: []`
**Fix:** Run the grant access migration:
```sql
UPDATE page_restrictions SET passenger_access = true WHERE page_path = '/trips';
```

#### Issue 2: Page Not in Database
**Symptom:** `⚠️ Page "/trips" not found in page_restrictions`
**Fix:** Check if trips page exists in page_restrictions table:
```sql
SELECT * FROM page_restrictions WHERE page_path = '/trips';
```

If missing, insert it:
```sql
INSERT INTO page_restrictions (page_name, page_path, is_active, passenger_access)
VALUES ('Trips', '/trips', true, true);
```

#### Issue 3: User Role Not Set
**Symptom:** Console shows `Loading page access for role: undefined`
**Fix:** Check localStorage in browser console:
```javascript
// Run in browser console
localStorage.getItem('user_role')
```

Should return: `"passenger"`

If not, there's an issue with the signup/login flow.

#### Issue 4: Cache Issues
**Fix:** Clear browser cache and localStorage:
```javascript
// Run in browser console
localStorage.clear();
// Then reload and login again
```

### Step 5: Test the Fix

1. Clear browser cache and localStorage
2. Login as a passenger user
3. Should automatically redirect to `/trips`
4. Should see trips page without "access denied" error
5. Check console logs to verify page access is loaded correctly

## Additional Verification

### Check User Table
Verify passenger users exist:
```sql
SELECT id, email, role, is_active FROM users WHERE role = 'passenger';
```

### Check All Page Restrictions
See full picture of what's configured:
```sql
SELECT 
  page_name, 
  page_path, 
  is_active,
  fleet_manager_access,
  maintenance_team_access,
  driver_access,
  passenger_access,
  administration_access,
  client_company_liaison_access
FROM page_restrictions 
ORDER BY page_name;
```

### Re-Grant All Passenger Access
If needed, grant passenger access to multiple pages:
```sql
UPDATE page_restrictions 
SET passenger_access = true 
WHERE page_path IN ('/trips', '/dashboard');
```

## Expected Behavior After Fix

1. Passenger logs in with email from allowed domain (pg.com or dentistahub.com)
2. User is automatically assigned `passenger` role
3. Session is created with 8-hour expiration
4. User redirects to `/trips` (default passenger page)
5. Console shows: `✓ [usePageAccess] Added page: /trips (Trips)`
6. User can view trips page without errors

## If Still Not Working

Check these files for any custom logic that might be interfering:

1. `src/services/authService.ts` - Line 138 (role storage)
2. `src/hooks/usePageAccess.ts` - Line 32 (page loading)
3. `src/services/pageRestrictionService.ts` - Line 160 (role mapping)
4. `src/components/ProtectedRoute.tsx` - Route protection logic
5. `src/App.tsx` - Navigation filtering

Contact support with:
- Browser console logs
- Database query results from debug script
- Network tab showing API requests to page_restrictions table

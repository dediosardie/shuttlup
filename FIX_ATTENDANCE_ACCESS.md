# Fix Attendance Page Access Denied Error

## Problem
Drivers are getting "Access Denied" when trying to access `/attendance` page after login.

## Root Cause
The attendance page restriction has not been added to the `page_restrictions` table in your Supabase database.

## Solution

### Run Migration in Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the following SQL:

```sql
-- Add Attendance page to page_restrictions table
INSERT INTO page_restrictions (
  page_name, 
  page_path, 
  description, 
  fleet_manager_access, 
  maintenance_team_access, 
  driver_access, 
  administration_access, 
  client_company_liaison_access,
  is_active
)
VALUES (
  'Driver Attendance', 
  '/attendance', 
  'Driver check-in/check-out with photo capture and GPS tracking', 
  true,  -- fleet_manager can access
  false, -- maintenance_team cannot access
  true,  -- driver can access
  true,  -- administration can access
  false, -- client_company_liaison cannot access
  true   -- is_active
)
ON CONFLICT (page_name) 
DO UPDATE SET
  page_path = EXCLUDED.page_path,
  description = EXCLUDED.description,
  fleet_manager_access = EXCLUDED.fleet_manager_access,
  maintenance_team_access = EXCLUDED.maintenance_team_access,
  driver_access = EXCLUDED.driver_access,
  administration_access = EXCLUDED.administration_access,
  client_company_liaison_access = EXCLUDED.client_company_liaison_access,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

4. Click **Run** to execute the SQL
5. You should see the verification result showing the attendance page with proper access rights

### Verify the Page Restriction

To check if the attendance page is properly configured:

```sql
SELECT 
  page_name, 
  page_path, 
  driver_access, 
  fleet_manager_access, 
  administration_access,
  is_active 
FROM page_restrictions 
WHERE page_path = '/attendance';
```

Expected result:
- page_name: `Driver Attendance`
- page_path: `/attendance`
- driver_access: `true` ✅
- fleet_manager_access: `true` ✅
- administration_access: `true` ✅
- is_active: `true` ✅

### View All Page Restrictions

To see all configured pages and their access rights:

```sql
SELECT 
  page_name, 
  page_path, 
  driver_access, 
  fleet_manager_access, 
  maintenance_team_access,
  administration_access,
  client_company_liaison_access,
  is_active 
FROM page_restrictions 
ORDER BY page_name;
```

## After Running Migration

1. **Refresh your web app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Log out and log back in** as a driver
3. Navigate to `/attendance` - access should now be granted

## Testing Access by Role

Test with different roles to ensure proper access control:

| Role | Should Have Access? | Expected Behavior |
|------|-------------------|-------------------|
| **driver** | ✅ Yes | Can access attendance page |
| **fleet_manager** | ✅ Yes | Can access attendance page |
| **administration** | ✅ Yes | Can access attendance page |
| **maintenance_team** | ❌ No | Access denied, redirected to default page |
| **client_company_liaison** | ❌ No | Access denied, redirected to default page |

## Driver Redirection

When a driver logs in, they should be automatically redirected to `/attendance` as their default landing page. This is configured in `roleRedirects.ts`:

```typescript
export const ROLE_DEFAULT_PAGES: Record<UserRole, string> = {
  driver: '/attendance',  // ✅ Drivers land on attendance page
  administration: '/reports',
  maintenance_team: '/vehicles',
  fleet_manager: '/reports',
  client_company_liaison: '/reports',
};
```

## Still Having Issues?

### Check Browser Console

Look for these log messages:
```javascript
🔍 [usePageAccess] Loading page access for role: driver
✓ [usePageAccess] Added page: /attendance (Driver Attendance)
```

If you don't see the attendance page being added, the migration hasn't been applied yet.

### Check Database Directly

Verify the record exists:
```sql
SELECT * FROM page_restrictions WHERE page_path = '/attendance';
```

If the query returns no rows, the migration needs to be run.

### Clear Browser Cache

Sometimes cached access permissions can cause issues:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Close all browser tabs
3. Re-open the application
4. Log in again

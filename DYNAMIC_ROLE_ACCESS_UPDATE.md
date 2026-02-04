# Dynamic Role Access Update

## Changes Made

Updated the role-based access control system to dynamically fetch page restrictions from the `page_restrictions` database table instead of using hardcoded values.

## Modified Files

### 1. `src/utils/roleRedirects.ts`

**Before:** Used a hardcoded `roleAccessMap` with static paths for each role
```typescript
const roleAccessMap: Record<UserRole, string[]> = {
  driver: ['/trips', '/vehicles', '/fuel', '/incidents', '/attendance'],
  // ... other roles
};
```

**After:** Now fetches allowed paths dynamically from the database
```typescript
// Get accessible pages from database for this role
const accessiblePages = await pageRestrictionService.getAccessiblePagesByRole(role);
const allowedPaths = accessiblePages.map(page => page.page_path);
```

**Key Changes:**
- `checkRoleAccess()` function is now `async`
- Imports `pageRestrictionService` to query database
- Removed hardcoded `roleAccessMap` object
- Added console logging for debugging access checks
- Handles errors gracefully by redirecting to default page

### 2. `src/App.tsx`

**Updated:** Modified the role access check effect to handle async function
```typescript
// Wrapped checkRoleAccess call in async function
useEffect(() => {
  async function checkAccess() {
    // ... existing logic
    const redirectPath = await checkRoleAccess(userRole.role, currentPath);
    // ... rest of logic
  }
  checkAccess();
}, [activeModule, authLoading, roleLoading, pageAccessLoading, user, userRole]);
```

## Benefits

### 1. **Single Source of Truth**
- Page access is now controlled entirely by the `page_restrictions` table
- No need to update code when adding/removing page access
- Reduces risk of inconsistencies between code and database

### 2. **Runtime Updates**
- Access control can be updated in real-time via database
- No application redeployment needed for access changes
- Administrators can manage access through the Page Restrictions UI

### 3. **Consistency**
- Both `ProtectedRoute` component and `checkRoleAccess` function now use the same data source
- Eliminates duplicate role mappings across the codebase

### 4. **Better Debugging**
- Console logs show exactly what paths are checked and allowed
- Easy to troubleshoot access issues

## How It Works

1. **User logs in** → Role is determined from database
2. **User navigates to page** → `checkRoleAccess()` is called
3. **Query database** → `getAccessiblePagesByRole()` fetches allowed pages for that role
4. **Check access** → Compare current path against allowed paths
5. **Allow or redirect** → Grant access or redirect to default page

## Database Structure

The system uses these boolean columns in `page_restrictions` table:
- `driver_access`
- `fleet_manager_access`
- `maintenance_team_access`
- `administration_access`
- `client_company_liaison_access`

Example query result for driver role:
```sql
SELECT page_path FROM page_restrictions 
WHERE driver_access = true AND is_active = true;
```

Returns:
- `/trips`
- `/vehicles`
- `/fuel`
- `/incidents`
- `/attendance`

## Testing

After deploying this update:

1. **Verify driver access to attendance:**
   ```javascript
   // Should see in console:
   🔍 [checkRoleAccess] Role: driver, Current path: /attendance
   🔍 [checkRoleAccess] Allowed paths: ['/trips', '/vehicles', '/fuel', '/incidents', '/attendance']
   ✓ [checkRoleAccess] Access granted to /attendance for role driver
   ```

2. **Test role restrictions:**
   - Login as different roles
   - Navigate to various pages
   - Verify redirects work correctly
   - Check console logs for access decisions

3. **Test database updates:**
   - Update a page restriction in database
   - Refresh the application
   - Verify new access rules are applied immediately

## Migration Required

Ensure the attendance page restriction is added to the database:

```sql
INSERT INTO page_restrictions (
  page_name, page_path, description, 
  fleet_manager_access, maintenance_team_access, driver_access, 
  administration_access, client_company_liaison_access, is_active
)
VALUES (
  'Driver Attendance', '/attendance', 
  'Driver check-in/check-out with photo capture and GPS tracking', 
  true, false, true, true, false, true
)
ON CONFLICT (page_name) DO UPDATE SET
  driver_access = EXCLUDED.driver_access,
  is_active = EXCLUDED.is_active;
```

## Backward Compatibility

- `getRoleDefaultPage()` function remains unchanged
- `isProtectedPath()` function remains unchanged
- No changes to function exports or imports

## Performance Considerations

- Database query is executed on each access check
- Results are cached by `usePageAccess` hook in components
- Minimal performance impact due to small table size
- Consider adding caching layer if performance becomes an issue

## Future Enhancements

Possible improvements:
1. Add caching mechanism for frequently accessed paths
2. Implement WebSocket for real-time access updates
3. Add audit logging for access denials
4. Create admin UI for bulk access management

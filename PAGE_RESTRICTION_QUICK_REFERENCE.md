# Page Restriction Quick Reference

## Quick Start

### Check if User Can Access a Page

```typescript
import { usePageAccess } from './hooks/usePageAccess';

function MyComponent() {
  const { hasPageAccess } = usePageAccess();
  
  if (hasPageAccess('/vehicles')) {
    // Show vehicles link
  }
}
```

### Protect a Route

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<ProtectedRoute 
  requiredModule="vehicles"   // RBAC check
  pagePath="/vehicles"        // Database check
>
  <VehicleModule />
</ProtectedRoute>
```

### Add New Page Protection

1. **Add to navItems:**
```typescript
{ 
  id: 'my_page', 
  module: 'my_module', 
  path: '/my-page',
  label: 'My Page',
  icon: <svg>...</svg>
}
```

2. **Add database entry:**
```sql
INSERT INTO page_restrictions (
  page_name, page_path, 
  fleet_manager_access, administration_access
) VALUES (
  'My Page', '/my-page',
  true, true
);
```

3. **Wrap route:**
```tsx
<ProtectedRoute pagePath="/my-page">
  <MyPageComponent />
</ProtectedRoute>
```

## API Reference

### usePageAccess Hook

```typescript
const { 
  hasPageAccess,        // (path: string) => boolean
  getAccessiblePages,   // () => string[]
  loading              // boolean
} = usePageAccess();
```

### ProtectedRoute Props

```typescript
interface ProtectedRouteProps {
  requiredModule?: Module;      // RBAC module check
  requiredPermission?: Permission; // RBAC permission check
  requiredRole?: UserRole;      // Specific role required
  pagePath?: string;            // Database restriction check
  fallback?: ReactNode;         // Custom access denied component
  children: ReactNode;
}
```

### pageRestrictionService Methods

```typescript
// Check if role has access
await pageRestrictionService.checkRoleAccess('/vehicles', 'driver');
// Returns: boolean

// Get all pages accessible by role
await pageRestrictionService.getAccessiblePagesByRole('driver');
// Returns: PageRestriction[]

// Get restriction by path
await pageRestrictionService.getByPagePath('/vehicles');
// Returns: PageRestriction | null
```

## Page Paths

| Page | Path |
|------|------|
| Dashboard | `/reports` |
| Vehicles | `/vehicles` |
| Drivers | `/drivers` |
| Trips | `/trips` |
| Maintenance | `/maintenance` |
| Fuel | `/fuel` |
| Incidents | `/incidents` |
| Compliance | `/compliance` |
| Disposal | `/disposal` |
| Users | `/users` |
| Page Access | `/page-restrictions` |

## Common Patterns

### Hide UI Element Based on Access

```tsx
const { hasPageAccess } = usePageAccess();

{hasPageAccess('/vehicles') && (
  <button>Add Vehicle</button>
)}
```

### Check Multiple Pages

```typescript
const { hasPageAccess } = usePageAccess();

const canAccessReports = hasPageAccess('/reports');
const canAccessVehicles = hasPageAccess('/vehicles');

if (canAccessReports && canAccessVehicles) {
  // User can access both
}
```

### Get All User's Accessible Pages

```typescript
const { getAccessiblePages } = usePageAccess();

const pages = getAccessiblePages();
// ['/vehicles', '/trips', '/fuel', ...]
```

### Custom Access Denied Component

```tsx
<ProtectedRoute 
  pagePath="/vehicles"
  fallback={<CustomAccessDenied />}
>
  <VehicleModule />
</ProtectedRoute>
```

## Debugging

### Check Current Page Access

```typescript
console.log('Has vehicle access:', hasPageAccess('/vehicles'));
console.log('All accessible:', getAccessiblePages());
```

### View Database Restrictions

```sql
-- See all restrictions
SELECT * FROM page_restrictions ORDER BY page_name;

-- See restrictions for specific role
SELECT page_name, page_path, driver_access 
FROM page_restrictions 
WHERE is_active = true;
```

### Console Debugging

```javascript
// In browser console
localStorage.getItem('user_role')  // Current user role
```

## Testing Checklist

- [ ] Page appears in navigation when access granted
- [ ] Page hidden in navigation when access denied
- [ ] Direct URL access blocked when no permission
- [ ] Access denied page displays correctly
- [ ] Multiple roles tested for each page
- [ ] Changes in database reflect immediately (after re-login)
- [ ] No console errors during navigation

## Common Issues

### Issue: Navigation not updating
**Fix:** Log out and log back in (page access cached on login)

### Issue: Access denied despite permission
**Fix:** Check BOTH module access AND page restriction in database

### Issue: Page path mismatch
**Fix:** Ensure path in code matches database exactly (case-sensitive)

---

**Need Help?** See [PAGE_RESTRICTION_AUTHENTICATION.md](PAGE_RESTRICTION_AUTHENTICATION.md) for detailed documentation.

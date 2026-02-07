# Route Module - Quick Reference

## Overview
The Route module is a maintenance-focused component for managing routes with part numbers, rates, and quantities.

## Features

### ✅ Dark Theme Mobile-First Design
- Responsive layout optimized for mobile devices
- Dark background (`bg-bg-primary`, `bg-bg-secondary`)
- Accent colors for actions (`text-accent`, `bg-accent`)
- Clean typography (`text-text-primary`, `text-text-secondary`)

### ✅ Statistics Dashboard
Three stat cards displaying:
1. **Total Routes** - Count of all routes
2. **Total PO Qty** - Sum of all purchase order quantities
3. **Average Rate** - Average rate across all routes (₱)

### ✅ Table Features
- **Search**: Filter routes by route name or part number
- **Double-click to edit**: Click any row twice to open edit form
- **Delete action**: Red trash icon in the last column
- **Auto-incrementing lines**: Lines number automatically assigned
- **Responsive columns**: Optimized for mobile and desktop

### ✅ Form Actions
- **Add Route**: Opens modal form
- **Edit Route**: Opens pre-filled modal form (double-click row)
- **Validation**: All fields required with proper checks
- **Modal design**: Centered overlay with dark theme

## Database Schema

```sql
routes (
  id UUID PRIMARY KEY,
  lines SERIAL (auto-increment),
  route TEXT NOT NULL,
  part_number TEXT NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  po_qty INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## Field Specifications

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `lines` | number | Auto-incrementing line number | Auto-generated |
| `route` | text | Route name/description | Required |
| `part_number` | text | Part number reference | Required |
| `rate` | number | Rate in ₱ (Peso) | Required, > 0 |
| `po_qty` | number | Purchase order quantity | Required, > 0 |

## Setup Instructions

### 1. Run Database Migrations

Execute these SQL scripts in your Supabase SQL Editor:

```bash
# 1. Create the routes table
migrations/create_routes_table.sql

# 2. Add routes page to page_restrictions
migrations/add_routes_page_restriction.sql
```

### 2. Access Permissions

By default, these roles have access to the Routes page:
- ✅ Fleet Manager
- ✅ Maintenance Team
- ✅ Administration
- ❌ Drivers
- ❌ Passengers
- ❌ Client Liaison

### 3. Navigation

The Routes page appears in the main navigation menu under the maintenance group.

## Usage

### Adding a Route
1. Click **"Add Route"** button
2. Fill in all required fields:
   - Route name
   - Part number
   - Rate (₱)
   - PO Qty
3. Click **"Add Route"** to save

### Editing a Route
1. **Double-click** any row in the table
2. Modify the fields
3. Click **"Update Route"** to save changes

### Deleting a Route
1. Click the **red trash icon** in the Delete column
2. Confirm the deletion in the popup

### Searching Routes
- Use the search bar to filter by route name or part number
- Search is case-insensitive

## Mobile Optimizations

### Responsive Breakpoints
- **Mobile**: Full-width layout, stacked elements
- **Tablet (sm:)**: 2-column stats, side-by-side buttons
- **Desktop**: Full table view with all columns visible

### Touch Targets
- All buttons have adequate padding for touch interaction
- Double-tap on mobile triggers edit mode
- Large, accessible delete buttons

## Files Created

### Component
- `src/components/RouteModule.tsx` - Main route management component

### Types
- `src/types.ts` - Updated with Route interface

### Migrations
- `migrations/create_routes_table.sql` - Database table creation
- `migrations/add_routes_page_restriction.sql` - Page access permissions

### Integration
- `src/App.tsx` - Added route navigation and rendering

## API Operations

The module uses Supabase client for CRUD operations:

```typescript
// Load all routes
supabase.from('routes').select('*').order('lines', { ascending: true })

// Create route
supabase.from('routes').insert({ route, part_number, rate, po_qty })

// Update route
supabase.from('routes').update({ ... }).eq('id', routeId)

// Delete route
supabase.from('routes').delete().eq('id', routeId)
```

## Styling Classes

### Container
- `min-h-screen bg-bg-primary p-2 sm:p-4`

### Cards
- `bg-bg-secondary border border-border-muted`

### Buttons
- Primary: `bg-gradient-to-r from-accent to-accent-hover text-white`
- Secondary: `bg-bg-elevated text-text-primary border border-border-muted`
- Delete: `text-red-500 hover:text-red-400`

### Text
- Primary: `text-text-primary`
- Secondary: `text-text-secondary`
- Muted: `text-text-muted`

## Next Steps

1. Run the database migrations
2. Refresh the application
3. Navigate to the Routes page from the main menu
4. Start adding and managing routes

## Troubleshooting

### Routes page not showing in navigation
- Verify migrations are executed
- Check user role has access in page_restrictions table
- Clear browser cache and re-login

### Cannot add/edit routes
- Check Supabase connection
- Verify RLS policies are enabled
- Ensure user is authenticated

### Table not loading
- Open browser console (F12) for errors
- Verify routes table exists in database
- Check network tab for failed API calls

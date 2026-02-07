# Route Module: Bulk Import from Rates

## Overview
Enhanced the Route Module to support bulk importing all rates from the `public.rates` table with PO Number and Month tracking.

## Changes Made

### 1. Database Schema Updates

#### Migration: `add_month_po_number_to_routes.sql`
Added two new columns to the `routes` table:
- **`po_number`** (TEXT, optional) - Purchase Order number for the route
- **`month`** (DATE, optional) - Month associated with the route
- Created indexes on both columns for query performance

### 2. TypeScript Type Updates

#### `types.ts`
Updated `Route` interface to include:
```typescript
export interface Route {
  id: string;
  lines: number;
  route: string;
  part_number: string;
  rate: number;
  po_qty: number;
  po_number?: string;  // NEW
  month?: string;      // NEW
  created_at?: string;
  updated_at?: string;
}
```

### 3. RouteModule Component Enhancements

#### New Features:

**1. Bulk Import Mode**
- When "Add Route" button is clicked, opens modal in bulk import mode
- Fetches all rates from `public.rates` table
- Imports each rate as a new route with user-provided PO Number and Month

**2. Smart Modal Behavior**
- **Bulk Import Mode**: Shows PO Number and Month fields only
  - Pre-fills Month with last day of current month
  - Displays info message about import process
- **Manual Add/Edit Mode**: Shows all route fields (route, part_number, rate, po_qty, po_number, month)
- **Double-click Edit**: Opens modal in edit mode for existing route

**3. Data Mapping (Rates → Routes)**
```javascript
public.route.lines = public.rates.line
public.route.route = public.rates.route
public.route.rate = public.rates.rate
public.route.part_number = '' (empty, as rates don't have this)
public.route.po_qty = 0 (default, as rates don't have this)
public.route.po_number = user input from modal
public.route.month = user input from modal (date picker)
```

**4. Month Display Format**
- Stored in database as DATE (YYYY-MM-DD)
- Displayed in table as "MMM-YY" format (e.g., "Feb-26")
- Helper function `formatMonthDisplay()` handles conversion

**5. Updated Table Columns**
Added two new columns to the routes table:
- **PO Number** - Displays purchase order number or '-' if empty
- **Month** - Displays formatted month (MMM-YY) or '-' if empty

#### New Functions:

```typescript
// Get last day of current month for default date
getLastDayOfCurrentMonth()

// Handle Add Route button click (opens bulk import modal)
handleNewRoute()

// Format date string to MMM-YY display format
formatMonthDisplay(dateString)

// Enhanced validation supporting both bulk import and manual entry
validateForm(isBulkImport: boolean)

// Enhanced save supporting bulk import and manual CRUD
handleSave()
```

#### State Management:
```typescript
const [isBulkImport, setIsBulkImport] = useState(false);
const [formData, setFormData] = useState({
  route: '',
  part_number: '',
  rate: '',
  po_qty: '',
  po_number: '',   // NEW
  month: '',       // NEW
});
```

## User Workflow

### Bulk Import from Rates
1. Click "Add Route" button
2. Modal opens titled "Import Routes from Rates"
3. Enter PO Number (required)
4. Select Month (defaults to last day of current month)
5. Click "Import All Rates Route"
6. System fetches all rates from `public.rates`
7. Creates one route entry for each rate with mapping
8. Success message shows count of imported routes

### Manual Add/Edit
1. To manually add: Edit an existing route by double-clicking
2. Modal shows all fields including optional PO Number and Month
3. Fill in required fields (route, part_number, rate, po_qty)
4. Optionally add PO Number and Month
5. Click "Add Route" or "Update Route"

### View Routes
- Table displays 8 columns: Lines, Route, Part Number, Rate, PO Qty, PO Number, Month, Delete
- Month column shows formatted date (MMM-YY)
- PO Number column shows text or '-' if empty
- Double-click any row to edit

## Database Operations

### Bulk Import Query
```sql
SELECT * FROM public.rates ORDER BY line ASC;
-- Maps each rate to:
INSERT INTO public.routes (lines, route, part_number, rate, po_qty, po_number, month)
VALUES (rate.line, rate.route, '', rate.rate, 0, <user_input_po>, <user_input_month>);
```

### Manual Operations
- **INSERT**: Add single route with all fields
- **UPDATE**: Update existing route (preserves all fields)
- **DELETE**: Remove route by ID
- **SELECT**: Load routes ordered by lines ascending

## UI/UX Improvements

### Modal States
- **Bulk Import**: Compact form with 2 fields + info message
- **Manual Add**: Full form with 8 fields (6 required + 2 optional)
- **Edit**: Pre-filled form with existing route data

### Visual Indicators
- Info badge in bulk import mode explains process
- Required field indicators (red asterisk)
- Default values for convenience (month picker)
- Success/error messages for all operations

### Table Enhancements
- New columns integrate seamlessly with existing design
- Consistent dark theme styling
- Responsive column widths
- Proper data formatting (currency, numbers, dates)

## Deployment Steps

1. **Run Migration**:
   ```sql
   -- Execute in Supabase SQL Editor:
   -- migrations/add_month_po_number_to_routes.sql
   ```

2. **Verify Rates Table**:
   - Ensure `public.rates` table has data
   - Columns needed: line, route, rate

3. **Test Workflow**:
   - Click "Add Route" → verify bulk import modal
   - Enter PO Number and select Month
   - Import → verify routes created from rates
   - Double-click route → verify edit works with new fields

## Build Status
✅ **Build Successful**: 135 modules transformed, no errors

## Breaking Changes
None - existing routes will continue to work. New columns are optional and default to NULL.

## Future Enhancements
- Bulk edit PO Number/Month for multiple routes
- Filter routes by Month or PO Number
- Export routes to CSV with new fields
- Validation to prevent duplicate imports (same PO + Month)

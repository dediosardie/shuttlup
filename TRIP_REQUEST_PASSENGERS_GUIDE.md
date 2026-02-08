# Trip Request Passengers Implementation Guide

## Overview
Implemented a many-to-many relationship between trip requests and passenger users using a junction table approach. This allows requestors to select multiple passengers from the system for each trip request.

## Database Schema

### New Table: `trip_request_passengers`
Junction table linking trip requests with passenger users.

```sql
CREATE TABLE trip_request_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_request_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
  passenger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_trip_passenger UNIQUE(trip_request_id, passenger_user_id)
);
```

### Indexes
- `idx_trip_request_passengers_trip_id` - Fast lookups by trip request
- `idx_trip_request_passengers_user_id` - Fast lookups by passenger
- `idx_trip_request_passengers_status` - Filter by status

### Row Level Security (RLS)
- **SELECT**: All authenticated users can view passenger assignments
- **INSERT**: Trip requestors and admins can add passengers
- **UPDATE**: Trip requestors and admins can update passenger status
- **DELETE**: Trip requestors and admins can remove passengers

## TypeScript Types

### TripRequestPassenger Interface
```typescript
export interface TripRequestPassenger {
  id: string;
  trip_request_id: string;
  passenger_user_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  passenger?: User; // Joined data from users table
}
```

## Features Implemented

### 1. Passenger Selection UI
- **Search Input**: Autocomplete search by passenger name or email
- **Dropdown**: Displays filtered passenger options (excludes already selected)
- **Selected Chips**: Shows selected passengers as removable badges
- **Auto-count**: Passenger count automatically calculated from selections

### 2. Mobile Card Display
Shows passenger names in mobile card view:
```
No. of Passengers: 3
• John Doe
• Jane Smith
• Bob Johnson
```

### 3. Create Trip Request Flow
1. User selects passengers via search/autocomplete
2. System auto-calculates `passenger_count`
3. On save, creates trip request record
4. Inserts passenger assignments into junction table
5. Logs action in audit trail

### 4. Edit Trip Request Flow
1. Loads existing trip request
2. Fetches assigned passengers from junction table
3. Displays selected passengers in form
4. On save, compares old vs new passengers
5. Adds new passengers, removes unselected ones
6. Logs changes in audit trail

### 5. Display in Table/Cards
- Desktop table: Shows passenger count
- Mobile cards: Shows passenger count + names list
- Passenger data joined via foreign key relationship

## State Management

### New State Variables
```typescript
const [passengers, setPassengers] = useState<User[]>([]);
const [selectedPassengers, setSelectedPassengers] = useState<User[]>([]);
const [passengerSearch, setPassengerSearch] = useState('');
const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
const [tripPassengers, setTripPassengers] = useState<Record<string, TripRequestPassenger[]>>({});
```

## Key Functions

### `loadPassengers()`
Loads all active users with role = 'passenger' from the database.

### `loadTripPassengers(tripIds: string[])`
Loads passenger assignments for given trip IDs with joined user data.

### `handleAddPassenger(passenger: User)`
Adds passenger to selection, closes dropdown, clears search.

### `handleRemovePassenger(passengerId: string)`
Removes passenger from selection.

### `addTripPassengers(tripRequestId: string)`
Inserts passenger records into junction table for new trip request.

### `updateTripPassengers(tripRequestId: string)`
Syncs passenger assignments when editing:
- Compares current vs selected passengers
- Adds new passengers
- Removes unselected passengers

## Validation

### Form Validation Rules
- ✅ Shuttle number required
- ✅ Date of service required
- ✅ Reason required
- ✅ **At least one passenger required** (new)
- ❌ Passenger count no longer validated (auto-calculated)

## Audit Logging

Passenger changes are tracked in audit logs:

```typescript
// Create
await auditLogService.createLog(
  'CREATE',
  `Created trip request #${formData.shuttle_no}`,
  { 
    after: { 
      ...newRequest, 
      passengers: selectedPassengers.map(p => p.full_name) 
    }
  }
);

// Update
await auditLogService.createLog(
  'UPDATE',
  `Updated trip request #${formData.shuttle_no}`,
  { 
    before: editingRequest, 
    after: { 
      ...formData, 
      passengers: selectedPassengers.map(p => p.full_name) 
    }
  }
);
```

## Migration Instructions

### Step 1: Run SQL Migration
Execute the migration file in Supabase SQL Editor:
```
migrations/create_trip_request_passengers_table.sql
```

### Step 2: Verify Database
Check that:
- Table `trip_request_passengers` exists
- Indexes are created
- RLS policies are active
- Triggers are functioning

### Step 3: Test Functionality
1. Create new trip request with passengers
2. Edit existing trip request, add/remove passengers
3. Verify mobile card shows passenger names
4. Check audit logs for passenger tracking
5. Test passenger role filtering (only see their own trips)

## Query Examples

### Get Trip with Passengers
```typescript
const { data } = await supabase
  .from('trip_requests')
  .select(`
    *,
    passengers:trip_request_passengers(
      *,
      passenger:users(id, full_name, email)
    )
  `)
  .eq('id', tripId)
  .single();
```

### Get All Trips for Specific Passenger
```typescript
const { data } = await supabase
  .from('trip_request_passengers')
  .select(`
    *,
    trip:trip_requests(*)
  `)
  .eq('passenger_user_id', passengerId);
```

### Update Passenger Status
```typescript
const { error } = await supabase
  .from('trip_request_passengers')
  .update({ status: 'confirmed' })
  .eq('trip_request_id', tripId)
  .eq('passenger_user_id', passengerId);
```

## Future Enhancements

### Potential Features
1. **Passenger Status Management**: Mark individual passengers as confirmed/cancelled
2. **Passenger Notifications**: Email/SMS notifications when added to trip
3. **Passenger Preferences**: Track pickup locations per passenger
4. **Passenger History**: View all trips for a specific passenger
5. **Bulk Operations**: Add multiple passengers at once from CSV
6. **Passenger Check-in**: Mobile check-in for passengers at pickup
7. **Passenger Ratings**: Rate driver service after trip completion

## Troubleshooting

### Issue: Passengers not loading
**Check:**
- User table has records with `role = 'passenger'`
- Users have `is_active = true`
- RLS policies allow reading users table

### Issue: Cannot add passengers
**Check:**
- Junction table has correct foreign key constraints
- RLS policies allow INSERT for current user
- No duplicate passenger assignments (UNIQUE constraint)

### Issue: Passenger count mismatch
**Check:**
- `passenger_count` is set to `selectedPassengers.length` in save logic
- Junction table records match selected passengers
- No orphaned records in junction table

## Best Practices

1. **Always validate passenger selection**: Require at least one passenger
2. **Sync passenger count**: Auto-calculate from junction table records
3. **Clean up on delete**: CASCADE delete ensures no orphaned records
4. **Audit passenger changes**: Log all additions/removals for compliance
5. **Use transactions**: Wrap trip + passenger inserts in single transaction (future improvement)
6. **Optimize queries**: Use joins to fetch passengers with trips (avoid N+1 queries)

## Performance Considerations

- Junction table has indexes on both foreign keys for fast lookups
- Passenger list loaded once on page mount (cached in state)
- Joined queries fetch all data in single database round-trip
- Mobile cards limit passenger names display (shows count + names)

## Files Modified

1. `migrations/create_trip_request_passengers_table.sql` - New migration
2. `src/types.ts` - Added TripRequestPassenger interface
3. `src/components/TripRequestPage.tsx` - Complete passenger management UI

## Summary

✅ **Database**: Junction table with RLS and indexes
✅ **UI**: Search/autocomplete passenger selection
✅ **Mobile**: Passenger names displayed in cards
✅ **CRUD**: Full create/update/delete support
✅ **Audit**: Comprehensive change tracking
✅ **Validation**: Required passenger selection
✅ **Build**: Clean TypeScript compilation

The implementation provides a robust, scalable solution for managing multiple passengers per trip request with proper data normalization and user experience.

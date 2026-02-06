# Schema Migration to Shuttlup

## Overview
This guide explains how to migrate your Supabase database from the `public` schema to the `shuttlup` schema.

## Why Use a Custom Schema?

Using a custom schema (`shuttlup`) instead of the default `public` schema provides several benefits:

1. **Namespace Isolation**: Separates your application data from system tables and extensions
2. **Better Organization**: Clearly identifies which tables belong to your application
3. **Security**: Easier to manage permissions and access control
4. **Multi-tenancy**: Allows multiple applications to coexist in the same database
5. **Migration Safety**: Reduces risk of conflicts with default Postgres objects

## What Changed

### 1. Supabase Client Configuration
The Supabase client now connects to the `shuttlup` schema by default:

```typescript
// src/supabaseClient.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'shuttlup'
  }
});
```

### 2. All Tables Moved
All application tables are now in the `shuttlup` schema:
- `shuttlup.users`
- `shuttlup.vehicles`
- `shuttlup.drivers`
- `shuttlup.maintenance`
- `shuttlup.trips`
- `shuttlup.trip_locations`
- `shuttlup.fuel_transactions`
- `shuttlup.fuel_efficiency_metrics`
- `shuttlup.incidents`
- `shuttlup.incident_photos`
- `shuttlup.insurance_claims`
- `shuttlup.documents`
- `shuttlup.compliance_alerts`
- `shuttlup.disposal_requests`
- `shuttlup.disposal_auctions`
- `shuttlup.bids`
- `shuttlup.disposal_transfers`
- `shuttlup.audit_logs`
- `shuttlup.driver_attendance`
- `shuttlup.page_restrictions`

### 3. All Functions Moved
All database functions are now in the `shuttlup` schema:
- `shuttlup.authenticate_user()`
- `shuttlup.create_user_account()`
- `shuttlup.create_user_with_auth_id()`
- `shuttlup.update_user_password()`

## Migration Steps

### Step 1: Run Schema Migration SQL

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `migrations/move_to_shuttlup_schema.sql`
3. Paste and click **Run**

This script will:
- Create the `shuttlup` schema
- Move all tables from `public` to `shuttlup`
- Move all functions from `public` to `shuttlup`
- Grant appropriate permissions
- Set default privileges

### Step 2: Run Auth Integration Migration

After the schema migration, apply the auth integration:

1. In **SQL Editor**, copy contents of `migrations/add_supabase_auth_integration.sql`
2. Paste and click **Run**

This creates the `shuttlup.create_user_with_auth_id()` function.

### Step 3: Verify Migration

Run these verification queries in SQL Editor:

```sql
-- Check all tables in shuttlup schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'shuttlup' 
ORDER BY table_name;

-- Check all functions in shuttlup schema
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'shuttlup' 
ORDER BY routine_name;

-- Test a simple query
SELECT count(*) FROM shuttlup.users;
```

### Step 4: Update Application

The application code has already been updated to use the shuttlup schema. After running the migrations:

1. Clear browser cache
2. Restart your development server: `npm run dev`
3. Test login/signup functionality

## Troubleshooting

### Error: "schema 'shuttlup' does not exist"

**Solution**: Run the `move_to_shuttlup_schema.sql` migration first.

### Error: "relation 'users' does not exist"

**Solution**: 
- Make sure tables were moved to shuttlup schema
- Check that supabaseClient.ts has the schema configuration
- Verify with: `SELECT * FROM information_schema.tables WHERE table_name = 'users';`

### Error: "function authenticate_user() does not exist"

**Solution**: 
- Functions need to be in shuttlup schema
- Run: `ALTER FUNCTION public.authenticate_user(...) SET SCHEMA shuttlup;`

### Error: "permission denied for schema shuttlup"

**Solution**: Grant permissions:
```sql
GRANT USAGE ON SCHEMA shuttlup TO anon, authenticated;
GRANT ALL ON SCHEMA shuttlup TO postgres;
```

### Tables Still in Public Schema

If tables didn't move automatically:

```sql
-- Manual migration for a single table
ALTER TABLE public.users SET SCHEMA shuttlup;

-- Repeat for each table
```

## Rollback (If Needed)

To revert back to public schema:

```sql
-- Move tables back to public
ALTER TABLE shuttlup.users SET SCHEMA public;
ALTER TABLE shuttlup.vehicles SET SCHEMA public;
-- ... repeat for all tables

-- Move functions back
ALTER FUNCTION shuttlup.authenticate_user(...) SET SCHEMA public;
-- ... repeat for all functions

-- Update client configuration in code
-- Remove the schema option from supabaseClient.ts
```

## Testing After Migration

### Test 1: Login
```javascript
// Should work with existing accounts
Email: your@email.com
Password: your-password
```

### Test 2: Signup
```javascript
// Create new account
Email: test@pg.com
Password: Test123456
Name: Test User
```

### Test 3: Database Queries
```sql
-- All these should work
SELECT * FROM users LIMIT 5;
SELECT * FROM vehicles LIMIT 5;
SELECT * FROM drivers LIMIT 5;
```

## Performance Considerations

Using a custom schema has minimal performance impact:
- ✅ No additional query overhead
- ✅ Same indexing performance
- ✅ Same connection pooling
- ✅ Postgres search_path handles schema resolution efficiently

## Security Benefits

The `shuttlup` schema provides:
- **Isolation**: Application data separate from system tables
- **Clear Permissions**: Grant/revoke permissions at schema level
- **RLS Policies**: Row Level Security policies are schema-specific
- **Audit Trail**: Easier to track which queries access your data

## Best Practices

1. **Always use schema prefix in migrations**:
   ```sql
   CREATE TABLE shuttlup.new_table (...);
   ```

2. **Set search_path in functions**:
   ```sql
   SET search_path TO shuttlup, public;
   ```

3. **Grant permissions at schema level**:
   ```sql
   GRANT ALL ON SCHEMA shuttlup TO authenticated;
   ```

4. **Use schema in RLS policies**:
   ```sql
   CREATE POLICY policy_name ON shuttlup.table_name ...;
   ```

## Files Modified

- `src/supabaseClient.ts` - Added schema configuration
- `migrations/move_to_shuttlup_schema.sql` - Schema migration script
- `migrations/add_supabase_auth_integration.sql` - Updated to use shuttlup schema

## Next Steps

After successful migration:
1. ✅ Test all CRUD operations
2. ✅ Verify authentication flows
3. ✅ Check RLS policies are working
4. ✅ Test all API endpoints
5. ✅ Deploy updated application

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Postgres
2. Verify schema in SQL Editor
3. Review error messages in browser console
4. Check database permissions

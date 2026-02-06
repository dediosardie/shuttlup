# Supabase Auth Integration Migration Guide

## Overview
This migration adds support for Supabase Auth integration with the existing custom authentication system. When users sign up, they are created in both Supabase Auth and the local `shuttlup.users` table with the **same UUID**.

## What This Migration Does
- Creates a new database function `create_user_with_auth_id` that allows inserting a user with a specific UUID (from Supabase Auth)
- Ensures the user ID in `shuttlup.users` matches the user ID in Supabase Auth
- Maintains backward compatibility with the existing `create_user_account` function

## Prerequisites
Before running this migration, ensure:
1. Supabase project is set up and configured
2. PostgreSQL extension `pgcrypto` is enabled for password hashing
3. You have database admin access

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/add_supabase_auth_integration.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the project directory
cd d:/Projects/shuttlup

# Apply the migration
supabase db push
```

### Option 3: Manual SQL Execution
```bash
# Connect to your database
psql -h your-db-host -U your-username -d your-database

# Run the migration file
\i migrations/add_supabase_auth_integration.sql
```

## How It Works

### Signup Flow
1. **Frontend**: User fills out signup form with email, password, and full name
2. **Email Validation**: System checks if email is from allowed domain (@pg.com) or is a special admin email
3. **Supabase Auth**: User is created in Supabase Auth system
   - Returns a UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. **Database**: Same UUID is used to create user in `shuttlup.users` table
   - Password is hashed using bcrypt
   - Role is assigned (admin for special emails, driver for others)
   - Activation status is set (auto-active for admin, pending for others)
5. **Success**: User receives confirmation message

### Database Function: `create_user_with_auth_id`
```sql
create_user_with_auth_id(
  p_user_id UUID,        -- UUID from Supabase Auth
  p_email TEXT,          -- User's email
  p_password TEXT,       -- Plain text password (will be hashed)
  p_full_name TEXT,      -- User's full name
  p_role TEXT,           -- User role (driver, administration, etc.)
  p_is_active BOOLEAN    -- Whether account is active
)
```

## Email Domain Restrictions
- **Allowed Domain**: @pg.com
- **Special Admin Email**: dediosardie11@gmail.com (auto-activated)
- All other domains are rejected during signup

## Role Assignment
- **dediosardie11@gmail.com**: Gets `administration` role + auto-activated
- **@pg.com users**: Get `driver` role + requires admin approval

## Testing the Integration

### Test 1: Regular User Signup
```javascript
// Email: test@pg.com
// Expected: User created, needs approval
```

### Test 2: Admin User Signup
```javascript
// Email: dediosardie11@gmail.com
// Expected: User created, auto-activated
```

### Test 3: Invalid Domain
```javascript
// Email: test@gmail.com
// Expected: Error message about domain restriction
```

## Verification
After applying the migration, verify it worked:

```sql
-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'create_user_with_auth_id';

-- Test the function (replace with test values)
SELECT * FROM create_user_with_auth_id(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'test@pg.com',
  'testpassword123',
  'Test User',
  'driver',
  false
);
```

## Rollback (If Needed)
If you need to rollback this migration:

```sql
-- Remove the function
DROP FUNCTION IF EXISTS create_user_with_auth_id(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
```

## Troubleshooting

### Error: "Email already exists"
- The email is already registered in the database
- Solution: Use a different email or delete the existing user

### Error: "User ID already exists"
- The UUID is already used
- Solution: This shouldn't happen as Supabase generates unique UUIDs

### Error: "Failed to cleanup auth user"
- Database insertion failed but couldn't delete the Supabase Auth user
- Solution: Manually delete the user from Supabase Auth Dashboard

## Files Modified
- `src/services/authService.ts` - Updated signup function to use Supabase Auth
- `src/components/LoginPage.tsx` - Enhanced success messages
- `migrations/add_supabase_auth_integration.sql` - New database function

## Next Steps
After applying this migration:
1. Test the signup flow with both regular and admin emails
2. Verify users appear in both Supabase Auth and `shuttlup.users` table
3. Check that UUIDs match between both systems
4. Test login functionality with newly created accounts

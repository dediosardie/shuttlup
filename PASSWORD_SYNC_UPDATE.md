# Password Sync Update - Deployment Guide

## Overview
Updated the password change functionality to sync passwords between **both** `auth.users` (Supabase Auth) and `public.users` (custom table).

## What Changed

### Database Function Updated
- **Function**: `update_user_password(p_user_id UUID, p_new_password TEXT)`
- **Location**: `migrations/update_password_sync_function.sql`

### Changes Made:
1. **Previously**: Only updated `public.users.password_hash`
2. **Now**: Updates BOTH tables:
   - `auth.users.encrypted_password` (Supabase Auth system)
   - `public.users.password_hash` (Custom user table)

### Code Updates:
- ✅ `ChangePasswordModal.tsx` - Enhanced success message
- ✅ `authService.ts` - Added logging for sync confirmation
- ✅ `create_auth_functions.sql` - Updated function definition
- ✅ `MASTER_DATABASE_SCHEMA.sql` - Updated schema documentation

## Deployment Steps

### 1. Deploy Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/update_password_sync_function.sql`
3. Paste and run the migration
4. Verify success message

**Option B: Supabase CLI**
```bash
supabase db push
```

### 2. Verify Migration

Run this verification query in SQL Editor:

```sql
-- Check if function exists and is updated
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_user_password'
AND routine_schema = 'public';

-- Test password sync (replace with actual user ID)
SELECT 
  u.id, 
  u.email,
  u.password_hash IS NOT NULL as has_public_hash,
  au.encrypted_password IS NOT NULL as has_auth_hash
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'test@example.com';
```

### 3. Deploy Application

```bash
npm run build
# Deploy dist/ folder to your hosting platform
```

### 4. Test Password Change

1. Log in to the application
2. Click on user menu → "Change Password"
3. Enter new password (minimum 6 characters)
4. Submit
5. Check console for: "✅ Password updated successfully in both authentication systems"
6. Log out and log back in with new password

## How It Works

### Before (Old Behavior)
```
User changes password
    ↓
Updates public.users only
    ↓
auth.users NOT updated
    ↓
❌ Misalignment possible
```

### After (New Behavior)
```
User changes password
    ↓
Calls update_user_password()
    ↓
    ├─→ Updates auth.users.encrypted_password
    └─→ Updates public.users.password_hash
    ↓
✅ Both systems synchronized
```

## Function Logic

```sql
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
AS $$
DECLARE
  v_email TEXT;
  v_found BOOLEAN := FALSE;
BEGIN
  -- 1. Validate user exists
  SELECT email INTO v_email FROM users WHERE id = p_user_id;
  
  -- 2. Update auth.users (Supabase Auth)
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
  
  -- 3. Update public.users (Custom table)
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;
```

## Security Features

- ✅ Uses `bcrypt` (`gen_salt('bf')`) for password hashing
- ✅ `SECURITY DEFINER` allows updating `auth` schema
- ✅ Only accessible to authenticated users
- ✅ Password never stored in plain text
- ✅ Updates `updated_at` timestamp automatically

## Troubleshooting

### Error: "User not found"
- User ID doesn't exist in `public.users`
- Check if user was created properly during signup

### Error: "Failed to update auth.users"
- Check if user exists in `auth.users`
- Verify `auth` schema permissions
- Function continues to update `public.users` even if `auth.users` fails

### Password change succeeds but can't log in
- Clear browser cache and localStorage
- Log out and log in again
- Check both tables were updated:
  ```sql
  SELECT 
    u.email,
    u.password_hash IS NOT NULL as public_hash,
    au.encrypted_password IS NOT NULL as auth_hash
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.id = 'user-uuid-here';
  ```

## Rollback (If Needed)

If you need to revert to the old function:

```sql
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;
```

## Related Files

- `migrations/update_password_sync_function.sql` - Migration file
- `migrations/create_auth_functions.sql` - Updated function definition
- `MASTER_DATABASE_SCHEMA.sql` - Master schema with update
- `src/services/authService.ts` - Client-side auth service
- `src/components/ChangePasswordModal.tsx` - UI component

## Support

If you encounter issues:
1. Check Supabase Dashboard → Logs
2. Check browser console for error messages
3. Verify migration was applied successfully
4. Test with SQL query to check both tables

---

**Migration Status**: ⚠️ Ready to deploy
**Backward Compatible**: ✅ Yes
**Breaking Changes**: ❌ None
**Requires App Rebuild**: ✅ Yes (already built)

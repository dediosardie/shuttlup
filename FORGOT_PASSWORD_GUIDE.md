# Forgot Password Implementation - Complete Guide

## Overview
Implemented a complete password reset system with token-based verification that updates **both** `auth.users` and `public.users` tables.

## Features Implemented

### 1. Password Reset Flow
```
User enters email → Token generated → Token returned (dev) or emailed (prod) 
→ User enters token + new password → Both databases updated → Success
```

### 2. Database Components

#### New Table: `password_resets`
- Stores reset tokens with expiration
- Tracks usage and security info (IP, user agent)
- Auto-expires after 1 hour
- RLS policies enabled

#### New Functions:
1. **`request_password_reset(email, ip_address, user_agent)`**
   - Generates secure 64-char hex token
   - Invalidates old tokens
   - Returns token (dev) or would email it (prod)
   - Prevents email enumeration attacks

2. **`verify_reset_token(token)`**
   - Validates token without consuming it
   - Checks expiration and usage status
   - Returns user info if valid

3. **`reset_password_with_token(token, new_password)`**
   - Validates token
   - Updates `auth.users.encrypted_password`
   - Updates `public.users.password_hash`
   - Marks token as used
   - Invalidates all sessions (forces re-login)

4. **`cleanup_expired_password_resets()`**
   - Removes tokens older than 24 hours
   - Can be run via cron job

### 3. Client-Side Changes

#### Updated `authService.ts`:
- ✅ `forgotPassword(email)` - Request password reset
- ✅ `verifyResetToken(token)` - Validate token
- ✅ `resetPasswordWithToken(token, password)` - Complete reset

#### Updated `LoginPage.tsx`:
- ✅ Forgot password form
- ✅ Reset password form with token input
- ✅ Auto-flow from forgot → reset (dev mode)
- ✅ User feedback for all states

## Deployment Steps

### Step 1: Deploy Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/implement_password_reset_system.sql`
3. Execute the query
4. Verify success

**Option B: Supabase CLI**
```bash
supabase db push
```

### Step 2: Verify Migration

Run verification queries:

```sql
-- 1. Check table exists
SELECT * FROM password_resets LIMIT 0;

-- 2. Check functions exist
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_name IN (
  'request_password_reset',
  'verify_reset_token',
  'reset_password_with_token',
  'cleanup_expired_password_resets'
);

-- Should return 4 functions
```

### Step 3: Deploy Application

```bash
npm run build
# Deploy dist/ folder (952.85 kB)
```

### Step 4: Test the Flow

#### Test 1: Request Password Reset
1. Go to login page
2. Click "Forgot Password?"
3. Enter your email address
4. Click "Send Reset Link"
5. **Dev Mode**: Token will be displayed
6. **Prod Mode**: Token would be emailed

#### Test 2: Reset Password
1. Copy the reset token (from screen or email)
2. Enter the token in the "Reset Token" field
3. Enter new password (min 6 chars)
4. Confirm new password
5. Click "Update Password"
6. Should see success message

#### Test 3: Verify Sync
```sql
-- Check both databases have the updated password
SELECT 
  u.id,
  u.email,
  u.password_hash IS NOT NULL as public_has_hash,
  au.encrypted_password IS NOT NULL as auth_has_hash,
  u.updated_at as public_updated,
  au.updated_at as auth_updated
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'test@example.com';

-- Both should be TRUE and timestamps should be recent
```

## User Flow Examples

### Flow 1: Forgot Password (Development)
```
1. User clicks "Forgot Password?" on login page
2. User enters email: john@example.com
3. System generates token: a1b2c3d4e5f6...
4. Success message shows token (for dev)
5. Auto-redirects to reset password page
6. Token is pre-filled
7. User enters new password
8. Both auth.users and public.users are updated
9. Success! User can now login
```

### Flow 2: Forgot Password (Production)
```
1. User clicks "Forgot Password?" on login page
2. User enters email: john@example.com
3. System generates token and sends email
4. User checks email and copies token
5. User manually enters token on reset page
6. User enters new password
7. Both databases updated
8. Success! User can now login
```

## Security Features

### Token Security
- ✅ 32-byte random token (256-bit entropy)
- ✅ Stored as 64-character hex string
- ✅ One-time use (marked as used after reset)
- ✅ 1-hour expiration
- ✅ Old tokens auto-invalidated on new request

### Database Security
- ✅ bcrypt password hashing
- ✅ RLS policies on password_resets table
- ✅ SECURITY DEFINER for auth schema access
- ✅ Email enumeration protection
- ✅ IP address and user agent logging

### Session Security
- ✅ All sessions invalidated after password reset
- ✅ Forces re-login with new password
- ✅ Prevents session hijacking after reset

## Production Configuration

### Email Integration (TODO)
To enable email sending in production, update `request_password_reset` function:

```sql
-- Add email sending logic
-- Example with Supabase Edge Function:
PERFORM net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/send-reset-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
  ),
  body := jsonb_build_object(
    'to', p_email,
    'token', v_token,
    'reset_url', 'https://yourdomain.com/reset-password?token=' || v_token
  )
);
```

### Cron Job for Cleanup
Enable automatic cleanup of expired tokens:

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'cleanup-password-resets',
  '0 2 * * *',  -- Run at 2 AM daily
  'SELECT cleanup_expired_password_resets()'
);
```

Or run manually:
```sql
SELECT cleanup_expired_password_resets();
```

## API Reference

### `authService.forgotPassword(email)`
```typescript
const { error, token } = await authService.forgotPassword('user@example.com');
if (error) {
  console.error('Failed:', error);
} else {
  console.log('Token:', token); // In dev mode
}
```

### `authService.verifyResetToken(token)`
```typescript
const { valid, email, error } = await authService.verifyResetToken(token);
if (valid) {
  console.log('Valid for:', email);
}
```

### `authService.resetPasswordWithToken(token, password)`
```typescript
const { error } = await authService.resetPasswordWithToken(token, 'newpass123');
if (!error) {
  console.log('Password reset successfully!');
}
```

## Database Schema

### password_resets Table
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
email       TEXT
token       TEXT UNIQUE         -- 64-char hex
expires_at  TIMESTAMP           -- 1 hour from creation
used_at     TIMESTAMP           -- NULL until used
created_at  TIMESTAMP
ip_address  TEXT                -- Security logging
user_agent  TEXT                -- Security logging
```

## Troubleshooting

### Issue: "Invalid or expired reset token"
**Causes:**
- Token already used
- Token expired (>1 hour old)
- User account inactive
- Token doesn't exist

**Solution:**
- Request a new reset token
- Check token expiration in database:
  ```sql
  SELECT token, expires_at, used_at, expires_at > CURRENT_TIMESTAMP as is_valid
  FROM password_resets
  WHERE email = 'user@example.com'
  ORDER BY created_at DESC
  LIMIT 1;
  ```

### Issue: Password reset succeeds but can't login
**Causes:**
- Session not cleared properly
- Password not synced to both databases

**Solution:**
- Clear browser cache/localStorage
- Verify both databases updated:
  ```sql
  SELECT 
    u.email,
    u.password_hash IS NOT NULL as public_updated,
    au.encrypted_password IS NOT NULL as auth_updated,
    u.updated_at,
    au.updated_at
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.id = 'user-uuid-here';
  ```

### Issue: Token not appearing (dev mode)
**Cause:** Function not returning token in response

**Solution:**
- Check function response:
  ```sql
  SELECT request_password_reset('test@example.com', NULL, NULL);
  ```
- Should return JSON with token field

### Issue: Multiple active tokens
**Cause:** Old tokens not invalidated

**Solution:**
- Function auto-invalidates old tokens
- Manual cleanup:
  ```sql
  UPDATE password_resets
  SET used_at = CURRENT_TIMESTAMP
  WHERE user_id = 'user-uuid'
    AND used_at IS NULL;
  ```

## Monitoring & Maintenance

### Check Reset Activity
```sql
-- Recent password resets
SELECT 
  pr.email,
  pr.created_at,
  pr.used_at,
  pr.expires_at,
  CASE 
    WHEN pr.used_at IS NOT NULL THEN 'Used'
    WHEN pr.expires_at < CURRENT_TIMESTAMP THEN 'Expired'
    ELSE 'Active'
  END as status
FROM password_resets pr
ORDER BY pr.created_at DESC
LIMIT 20;
```

### Check Expired Tokens
```sql
SELECT COUNT(*)
FROM password_resets
WHERE expires_at < CURRENT_TIMESTAMP
  AND used_at IS NULL;
```

### Manual Token Revocation
```sql
-- Revoke specific token
UPDATE password_resets
SET used_at = CURRENT_TIMESTAMP
WHERE token = 'token-to-revoke';

-- Revoke all tokens for a user
UPDATE password_resets
SET used_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid'
  AND used_at IS NULL;
```

## Migration Rollback (If Needed)

```sql
-- Drop functions
DROP FUNCTION IF EXISTS reset_password_with_token(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_reset_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS request_password_reset(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_password_resets() CASCADE;

-- Drop table
DROP TABLE IF EXISTS password_resets CASCADE;
```

## Related Files
- `migrations/implement_password_reset_system.sql` - Database migration
- `src/services/authService.ts` - Client API functions
- `src/components/LoginPage.tsx` - UI implementation
- `PASSWORD_SYNC_UPDATE.md` - Password change sync docs

---

**Status**: ✅ Ready to deploy
**Database Updates**: Both auth.users and public.users
**Security**: Token-based, encrypted, time-limited
**Email**: Returns token in dev, configure email in prod

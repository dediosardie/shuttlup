# Supabase Auth Password Reset - Deployment Guide

## Overview
Implemented password reset using **Supabase's native authentication system** with automatic sync between `auth.users` and `public.users`.

## How It Works

### Password Reset Flow
```
1. User clicks "Forgot Password?" 
   ↓
2. Supabase Auth sends reset email with secure link
   ↓
3. User clicks link → Redirected to app with recovery token
   ↓
4. User enters new password
   ↓
5. Supabase updates auth.users
   ↓
6. Database trigger syncs to public.users
   ↓
7. Session invalidated → User must re-login
```

### Architecture

#### Frontend (`authService.ts`)
- ✅ `forgotPassword(email)` → `supabase.auth.resetPasswordForEmail()`
- ✅ `updatePassword(newPassword)` → `supabase.auth.updateUser()`
- ✅ Auto-detects recovery mode from URL parameters

#### Backend (Database)
- ✅ Trigger on `auth.users` watches for password changes
- ✅ Automatically syncs to `public.users.password_hash`
- ✅ Clears active sessions on password change
- ✅ Maintains `updated_at` timestamps

## Deployment Steps

### Step 1: Configure Supabase Email Settings

1. Go to Supabase Dashboard → **Authentication** → **Email Templates**
2. Enable "Confirm signup" and "Reset password" templates
3. Customize the reset password email template (optional)
4. Set redirect URL to your app: `https://yourdomain.com/?reset=true`

### Step 2: Deploy Database Trigger

Run this in Supabase Dashboard → **SQL Editor**:

```sql
-- Copy contents from migrations/sync_auth_password_trigger.sql

CREATE OR REPLACE FUNCTION sync_auth_password_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    UPDATE public.users
    SET 
      password_hash = NEW.encrypted_password,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    UPDATE public.users
    SET 
      session_id = NULL,
      session_expires_at = NULL
    WHERE id = NEW.id;
    
    RAISE LOG 'Password synced from auth.users to public.users for user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_password_to_public ON auth.users;

CREATE TRIGGER sync_password_to_public
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_password_to_public();
```

### Step 3: Verify Trigger Installation

```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_password_to_public';

-- Should show:
-- trigger_name: sync_password_to_public
-- event_manipulation: UPDATE
-- event_object_table: users
```

### Step 4: Deploy Application

```bash
npm run build
# Deploy dist/ folder (951.79 kB)
```

### Step 5: Configure Email Provider (Production)

In Supabase Dashboard → **Project Settings** → **Auth**:

1. **SMTP Settings** (Recommended for production):
   - Enable Custom SMTP
   - Enter your SMTP credentials (Gmail, SendGrid, etc.)
   
2. **Or use Supabase's default email** (development):
   - Already configured
   - Has rate limits

## Testing the Flow

### Test 1: Request Password Reset

1. Go to your app login page
2. Click "Forgot Password?"
3. Enter email: `test@example.com`
4. Click "Send Reset Link"
5. Success message appears
6. **Check email inbox** for reset link

### Test 2: Reset Password via Email

1. Open email from Supabase
2. Click the reset password link
3. You'll be redirected to: `https://yourdomain.com/?reset=true#access_token=...`
4. App automatically switches to "Reset Password" mode
5. Enter new password (min 6 chars)
6. Confirm password
7. Click "Update Password"
8. Success! Redirected to login

### Test 3: Verify Database Sync

```sql
-- Check both databases have the updated password
SELECT 
  au.email,
  au.encrypted_password IS NOT NULL as auth_has_password,
  u.password_hash IS NOT NULL as public_has_password,
  au.updated_at as auth_updated,
  u.updated_at as public_updated,
  u.session_id IS NULL as session_cleared
FROM auth.users au
JOIN public.users u ON au.id = u.id
WHERE au.email = 'test@example.com';

-- Both should be TRUE
-- Timestamps should be recent and match
-- session_cleared should be TRUE
```

### Test 4: Login with New Password

1. Go to login page
2. Enter email and new password
3. Should login successfully ✅

## Security Features

### Built-in Supabase Auth Security
- ✅ Secure token generation (UUID v4)
- ✅ Token expiration (1 hour default)
- ✅ One-time use tokens
- ✅ Rate limiting on email sending
- ✅ HTTPS required
- ✅ PKCE flow support

### Additional Security
- ✅ Automatic session invalidation
- ✅ Password hashing (bcrypt)
- ✅ Both databases synced
- ✅ Audit trail (updated_at timestamps)
- ✅ XSS protection in URL params

## Configuration Options

### Customize Redirect URL

In `authService.ts`, change:
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/?reset=true`, // Change this
});
```

### Customize Token Expiration

In Supabase Dashboard → **Auth** → **Settings**:
- JWT expiry: Default 3600 seconds (1 hour)
- Can be configured per project

### Customize Email Template

In Supabase Dashboard → **Auth** → **Email Templates**:
```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
```

## Troubleshooting

### Issue: "Email not sent"

**Causes:**
- Email not configured in Supabase
- Email provider rate limits
- Invalid email address
- User doesn't exist

**Solution:**
```sql
-- Check if user exists
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'user@example.com';

-- Check Supabase Dashboard → Logs for email sending errors
```

### Issue: "Reset link doesn't work"

**Causes:**
- Link expired (>1 hour old)
- Link already used
- Incorrect redirect URL

**Solution:**
- Request new reset link
- Check redirect URL matches your deployed app
- Verify URL parameters: `?reset=true` or `#type=recovery`

### Issue: "Password updated but can't login"

**Cause:** Sync trigger not working

**Solution:**
```sql
-- Manually sync password
UPDATE public.users u
SET 
  password_hash = au.encrypted_password,
  updated_at = au.updated_at
FROM auth.users au
WHERE u.id = au.id
  AND u.email = 'user@example.com';

-- Verify trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'sync_password_to_public';
```

### Issue: "Session still active after reset"

**Cause:** Session not cleared in trigger

**Solution:**
```sql
-- Manually clear session
UPDATE public.users
SET 
  session_id = NULL,
  session_expires_at = NULL
WHERE email = 'user@example.com';
```

## Monitoring

### Check Recent Password Resets

```sql
-- View recent password changes
SELECT 
  email,
  updated_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Sync Status

```sql
-- Compare auth.users and public.users
SELECT 
  au.email,
  au.updated_at as auth_time,
  u.updated_at as public_time,
  CASE 
    WHEN au.updated_at = u.updated_at THEN 'Synced'
    ELSE 'Out of sync'
  END as sync_status
FROM auth.users au
JOIN public.users u ON au.id = u.id
ORDER BY au.updated_at DESC
LIMIT 10;
```

### View Email Logs

In Supabase Dashboard:
- **Logs** → Filter by "auth"
- Look for "sent email" events
- Check for errors

## API Reference

### `authService.forgotPassword(email)`

```typescript
const { error } = await authService.forgotPassword('user@example.com');

if (error) {
  console.error('Failed to send reset email:', error);
} else {
  console.log('Reset email sent!');
}
```

### `authService.updatePassword(newPassword)`

```typescript
// Works for both logged-in users and password reset flow
const { error } = await authService.updatePassword('newpass123');

if (error) {
  console.error('Failed to update password:', error);
} else {
  console.log('Password updated in both databases!');
}
```

## Migration from Custom Token System

If you previously deployed the custom token system:

```sql
-- Drop old functions (optional cleanup)
DROP FUNCTION IF EXISTS reset_password_with_token(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_reset_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS request_password_reset(TEXT, TEXT, TEXT) CASCADE;

-- Drop old table (optional cleanup)
-- DROP TABLE IF EXISTS password_resets CASCADE;
```

## Comparison: Custom vs Supabase Auth

| Feature | Custom Token | Supabase Auth |
|---------|-------------|---------------|
| Email Sending | Manual | ✅ Built-in |
| Token Generation | Manual | ✅ Automatic |
| Security | Manual | ✅ Industry standard |
| Expiration | Manual | ✅ Configurable |
| Rate Limiting | Manual | ✅ Built-in |
| Customization | High | Medium |
| Maintenance | High | ✅ Low |
| Database Sync | ✅ Trigger | ✅ Trigger |

## Related Files

- `migrations/sync_auth_password_trigger.sql` - Database trigger
- `src/services/authService.ts` - Client API
- `src/components/LoginPage.tsx` - UI implementation
- `src/components/ChangePasswordModal.tsx` - Password change for logged-in users

---

**Status**: ✅ Ready to deploy  
**Email Provider**: Supabase (configure SMTP for production)  
**Database Sync**: Automatic via trigger  
**Security**: Industry-standard Supabase Auth  
**Maintenance**: Low - managed by Supabase

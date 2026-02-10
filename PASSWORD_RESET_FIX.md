# Password Reset Fix - Auth Sync Issue

## 🐛 Problem Identified

**Issue:** After resetting password, users cannot login with the new password.

**Root Cause:** Password reset updates `public.users.password_hash` but NOT `auth.users.encrypted_password`. Supabase Auth login checks `auth.users`, so the new password doesn't work.

---

## 🔍 Analysis

### Current Password Flows:

1. **Login** (`authService.signIn`)
   - Uses: `supabase.auth.signInWithPassword()`
   - Checks: `auth.users.encrypted_password`
   - ✅ Works correctly

2. **Change Password (Logged-in)** (`authService.updatePassword`)
   - Uses: `supabase.auth.updateUser({ password })`
   - Updates: `auth.users.encrypted_password`
   - Syncs to: `public.users.password_hash` via trigger `sync_password_to_public`
   - ✅ Works correctly

3. **Reset Password (Custom Token)** (`authService.resetPasswordWithToken`)
   - Uses: Database function `reset_password_with_token()`
   - Updates: `public.users.password_hash` ONLY
   - Missing: Does NOT update `auth.users.encrypted_password`
   - ❌ **BROKEN** - Login fails after reset

---

## ✅ Solution

### Fix: Update Migration to Sync Both Tables

The `reset_password_with_token()` function now updates BOTH tables:

```sql
-- Update password in public.users
UPDATE users 
SET 
  password_hash = new_password_hash,
  recovery_token = NULL,
  recovery_token_expires_at = NULL,
  updated_at = NOW()
WHERE id = v_user_id;

-- CRITICAL: Also update auth.users (for Supabase Auth login)
UPDATE auth.users
SET 
  encrypted_password = new_password_hash,
  updated_at = NOW()
WHERE id = v_user_id;
```

---

## 📋 Deployment Steps

### 1. Re-run Updated Migration

In **Supabase SQL Editor**, run the updated migration:

```sql
-- Copy/paste entire content of: migrations/add_recovery_tokens.sql
```

This will recreate the `reset_password_with_token()` function with the fix.

### 2. Verify the Fix

After running the migration, check the function:

```sql
-- View the function definition
SELECT pg_get_functiondef('reset_password_with_token'::regproc);
```

Should contain: `UPDATE auth.users SET encrypted_password`

### 3. Test the Flow

1. Request password reset (Forgot Password)
2. Check email and click link
3. Enter new password
4. Try to login with new password
5. ✅ Should work now!

---

## 🔐 Password Sync Architecture

### Complete Flow After Fix:

```
Password Reset Flow:
  User submits new password
    ↓
  authService.resetPasswordWithToken(token, password)
    ↓
  Bcrypt hashes password
    ↓
  Calls reset_password_with_token() database function
    ↓
  ┌─────────────────────────────────────┐
  │ UPDATE public.users.password_hash   │
  │ UPDATE auth.users.encrypted_password│ ← FIXED!
  └─────────────────────────────────────┘
    ↓
  Clear recovery token
    ↓
  User can login with new password ✅
```

### Change Password Flow (Already Working):

```
Change Password Flow:
  User submits new password
    ↓
  authService.updatePassword(password)
    ↓
  supabase.auth.updateUser({ password })
    ↓
  UPDATE auth.users.encrypted_password
    ↓
  TRIGGER: sync_password_to_public
    ↓
  UPDATE public.users.password_hash
    ↓
  User can login with new password ✅
```

---

## 🧪 Testing Queries

### Check if both tables have the same password hash:

```sql
SELECT 
  u.id,
  u.email,
  u.password_hash IS NOT NULL as public_has_password,
  au.encrypted_password IS NOT NULL as auth_has_password,
  u.password_hash = au.encrypted_password as passwords_match,
  u.updated_at as public_updated,
  au.updated_at as auth_updated
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'test@example.com';
```

### After password reset, both should match:
- `public_has_password`: TRUE
- `auth_has_password`: TRUE
- `passwords_match`: TRUE ← This should be TRUE after fix!

---

## 🚨 Important Notes

### Why Both Tables?

1. **`auth.users.encrypted_password`**
   - Used by Supabase Auth for login validation
   - Required for `signInWithPassword()` to work
   - Must be updated for login to work

2. **`public.users.password_hash`**
   - Used by custom authentication logic
   - Backup/reference for password
   - Kept in sync for consistency

### Migration is Idempotent

The migration can be run multiple times safely:
- `DROP FUNCTION IF EXISTS` clears old version
- `CREATE OR REPLACE` ensures clean recreation
- No data loss - only function logic changes

---

## ✅ Verification Checklist

After deploying the fix:

- [ ] Run updated migration in Supabase SQL Editor
- [ ] Request password reset for test user
- [ ] Complete password reset flow
- [ ] Run test query to verify both tables updated
- [ ] Try logging in with new password
- [ ] Confirm login works ✅

---

## 📊 Status

- **Issue:** Identified ✅
- **Fix:** Implemented ✅
- **Migration:** Updated ✅
- **Testing:** Pending deployment
- **Deployment:** Ready to deploy

---

**Next Action:** Run the updated `migrations/add_recovery_tokens.sql` in Supabase SQL Editor

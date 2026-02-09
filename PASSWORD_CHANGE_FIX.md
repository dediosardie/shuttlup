# Password Change Login Issue - FIXED

## Problem
Users could successfully change their password, but couldn't login with the new password.

## Root Cause
The authentication system was checking two different password sources:
1. **Login**: Called `authenticate_user()` RPC → checked `public.users.password_hash`
2. **Password Change**: Updated `auth.users.encrypted_password` via Supabase Auth
3. **Sync Issue**: The trigger to sync passwords wasn't working properly

## Solution
Simplified the authentication to use **ONLY Supabase Auth** as the single source of truth.

### Changes Made

#### 1. Updated `authService.signIn()` (Lines 52-152)
**Before:**
- Called `authenticate_user()` RPC (checked `public.users.password_hash`)
- Then called `supabase.auth.signInWithPassword()` (checked `auth.users.encrypted_password`)
- Two password checks = inconsistency

**After:**
- **Only** uses `supabase.auth.signInWithPassword()` 
- Single source of truth: `auth.users.encrypted_password`
- Fetches user details from `public.users` after auth succeeds
- Checks `is_active` status

#### 2. Flow Now Works Like This:

```typescript
// 1. Authenticate with Supabase Auth
supabase.auth.signInWithPassword({ email, password })
  ↓
// 2. Fetch user details from public.users
supabase.from('users').select('*').eq('id', authData.user.id)
  ↓
// 3. Check if user is active
if (!userData.is_active) → reject
  ↓
// 4. Create session
Generate sessionToken → Update public.users
  ↓
// 5. Store in localStorage
Store session, user_id, email, role, etc.
```

## Why This Works

### Password Change Flow:
1. User changes password via `ChangePasswordModal`
2. Calls `authService.updatePassword()`
3. Updates `auth.users.encrypted_password` via `supabase.auth.updateUser()`
4. Password is stored in Supabase Auth system ✅

### Login Flow (After Fix):
1. User enters email + password
2. `supabase.auth.signInWithPassword()` checks against `auth.users` ✅
3. Password matches → Login successful ✅
4. No more mismatch between two password sources ✅

## Benefits of This Approach

1. ✅ **Single Source of Truth**: `auth.users` is the ONLY password store
2. ✅ **Automatic Sync**: No need for triggers or manual sync
3. ✅ **Supabase Features**: Leverages built-in password hashing, security
4. ✅ **Simpler Code**: Removed dependency on `authenticate_user()` RPC
5. ✅ **More Secure**: Uses Supabase's battle-tested auth system
6. ✅ **Forgot Password Works**: Uses same auth system for consistency

## Testing

### Test Password Change:
1. Login with current credentials
2. Click profile → "Change Password"
3. Enter current password + new password
4. Submit → "Password changed successfully"
5. **Logout** (automatic or manual)
6. Login with **new password** → Success! ✅

### Test Forgot Password:
1. Go to login page → "Forgot Password?"
2. Enter email → Receive reset link
3. Click link → Enter new password
4. Submit → Redirected to login
5. Login with new password → Success! ✅

## Database Cleanup (Optional)

The old `authenticate_user()` RPC function is no longer used and can be removed:

```sql
-- Optional: Remove old authentication function (not needed anymore)
DROP FUNCTION IF EXISTS authenticate_user(p_email TEXT, p_password TEXT);
```

**Note:** Keep the `sync_auth_password_trigger.sql` trigger deployed - it's still useful for keeping `public.users` in sync for reference, even though login doesn't use it anymore.

## Build Status
✅ TypeScript compilation: Success  
✅ Vite build: Success (953.45 kB)  
✅ No errors

## Deployment Checklist
- [x] Updated `authService.signIn()` to use only Supabase Auth
- [x] Removed dependency on `authenticate_user()` RPC
- [x] Tested password change flow
- [x] Tested login with new password
- [x] Build successful
- [ ] Deploy to production
- [ ] Test in production environment

## Additional Notes

### Current Password Storage:
- **Primary**: `auth.users.encrypted_password` (Supabase Auth)
- **Reference**: `public.users.password_hash` (synced via trigger, not used for login)

### Future Improvements:
- Consider removing `password_hash` from `public.users` entirely since it's no longer needed
- Update user creation to use Supabase Auth signup instead of direct inserts
- Implement email verification flow if needed

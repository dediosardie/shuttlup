# Session Management - Quick Test Guide

## Pre-Deployment Checklist

Before deploying the session management system, complete these steps:

### 1. Database Migration
Execute the migration file in your Supabase SQL editor:

```sql
-- File: migrations/add_session_expiration.sql
-- This adds the session_expires_at column and indexes
```

**Steps:**
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `migrations/add_session_expiration.sql`
4. Execute the SQL
5. Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'session_expires_at';`

### 2. Optional: Clear Existing Sessions
To force all users to re-login with new session system:

```sql
UPDATE public.users
SET session_id = NULL,
    session_expires_at = NULL
WHERE session_id IS NOT NULL;
```

## Testing Session Features

### Test 1: Basic Login and Session Creation
**Expected Behavior:** Session token and expiration stored in localStorage and database

1. Open browser DevTools > Application > Local Storage
2. Log in with valid credentials
3. Verify the following keys exist:
   - `session_token`
   - `user_id`
   - `user_email`
   - `user_role`
   - `session_expires_at` (ISO timestamp 8 hours in future)
4. Open Supabase Dashboard > Table Editor > users
5. Find your user record
6. Verify `session_id` and `session_expires_at` are populated

**Pass Criteria:** ✅ All localStorage keys present, database updated

### Test 2: Session Expiration Check
**Expected Behavior:** Expired sessions are automatically logged out

**Quick Test (Manual Expiration):**
1. Log in successfully
2. Open DevTools > Console
3. Run: `localStorage.setItem('session_expires_at', new Date(Date.now() - 1000).toISOString())`
4. Wait 60 seconds (monitoring interval)
5. Should see alert: "Your session has expired. Please log in again."
6. Should be redirected to login page

**Pass Criteria:** ✅ Automatic logout after 60 seconds

### Test 3: Concurrent Session Replacement
**Expected Behavior:** Login from new device logs out previous device

**Testing Steps:**
1. **Device/Browser 1:** Log in with user account
2. Note the active module you're viewing
3. **Device/Browser 2** (or Incognito): Log in with same account
4. **Device/Browser 1:** Wait 60 seconds
5. Should see alert: "Your account has been logged in from another device. You have been logged out."
6. Should be redirected to login page

**Pass Criteria:** ✅ First session automatically logged out

### Test 4: Session Monitoring Active
**Expected Behavior:** Background monitoring checks session every minute

1. Log in successfully
2. Open DevTools > Console
3. Should see: "Session monitoring started"
4. Wait 60+ seconds
5. Network tab should show periodic requests to verify session
6. No errors in console

**Pass Criteria:** ✅ Console shows monitoring active, no errors

### Test 5: Logout Cleanup
**Expected Behavior:** All session data cleared on logout

1. Log in successfully
2. Click user menu > Logout
3. Open DevTools > Application > Local Storage
4. Verify all session keys removed:
   - No `session_token`
   - No `user_id`
   - No `user_email`
   - No `user_role`
   - No `session_expires_at`
5. Open Supabase Dashboard > Table Editor > users
6. Verify `session_id` and `session_expires_at` are NULL

**Pass Criteria:** ✅ Complete cleanup in localStorage and database

### Test 6: Browser Refresh (Session Persistence)
**Expected Behavior:** Session survives page refresh

1. Log in successfully
2. Navigate to any module
3. Refresh page (F5)
4. Should remain logged in
5. Should stay on same module

**Pass Criteria:** ✅ No re-login required after refresh

### Test 7: Session Validation on Route Change
**Expected Behavior:** Session checked but no unnecessary database calls

1. Log in successfully
2. Open DevTools > Network tab
3. Navigate between modules (Vehicle → Driver → Maintenance)
4. Should NOT see database requests for each navigation
5. Pages load instantly without "Access Denied" flash

**Pass Criteria:** ✅ Fast navigation, no database calls, no flashing

## Configuration Tests

### Adjust Session Duration (Optional)
**To test shorter session timeouts:**

Edit `src/services/authService.ts`:
```typescript
// Change from 8 hours to 2 minutes for testing
const SESSION_DURATION = 2 * 60 * 1000; // 2 minutes
```

Then test that session expires after 2 minutes.

**Remember to change back to production value:**
```typescript
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
```

### Adjust Monitoring Interval (Optional)
**To test faster checks:**

Edit `src/services/authService.ts`:
```typescript
// Change from 60 seconds to 10 seconds for testing
const SESSION_CHECK_INTERVAL = 10 * 1000; // 10 seconds
```

**Remember to change back:**
```typescript
const SESSION_CHECK_INTERVAL = 60 * 1000; // 60 seconds
```

## Performance Monitoring

### Check for Memory Leaks
1. Log in successfully
2. Open DevTools > Performance Monitor
3. Let application run for 10+ minutes
4. Monitor:
   - JavaScript heap size (should be stable)
   - DOM nodes (should not continuously increase)
   - Event listeners (should not accumulate)

**Pass Criteria:** ✅ Stable memory usage, no leaks

### Verify Monitoring Cleanup
1. Log in successfully
2. Open DevTools > Console
3. Log out
4. Should see: "Session monitoring stopped"
5. Wait 60+ seconds
6. Should NOT see any session check requests

**Pass Criteria:** ✅ Monitoring stops on logout

## Edge Cases

### Test: Invalid/Corrupted Session Token
1. Log in successfully
2. Open DevTools > Application > Local Storage
3. Change `session_token` to random value
4. Refresh page
5. Should be logged out automatically

**Pass Criteria:** ✅ Invalid token handled gracefully

### Test: Missing localStorage Data
1. Log in successfully
2. Open DevTools > Application > Local Storage
3. Delete `session_expires_at`
4. Refresh page
5. Should be logged out

**Pass Criteria:** ✅ Missing data handled gracefully

### Test: Database Session Deleted
1. Log in successfully
2. Open Supabase Dashboard > Table Editor > users
3. Set your `session_id` to NULL
4. Wait 60 seconds
5. Should be logged out with "session replaced" message

**Pass Criteria:** ✅ Database changes detected and handled

## Production Readiness

### Checklist Before Going Live

- [ ] Migration executed in production database
- [ ] All tests above passed
- [ ] Session duration appropriate (8 hours recommended)
- [ ] Monitoring interval appropriate (60 seconds recommended)
- [ ] Console logs reviewed (no errors)
- [ ] Existing users notified about re-login requirement
- [ ] Documentation shared with team
- [ ] Browser exit behavior decided (default vs strict mode)

### Monitoring in Production

**Week 1 Monitoring:**
- Track number of "session expired" events
- Track number of "session replaced" events
- Monitor for any authentication errors
- Gather user feedback on session timeout experience

**Performance Metrics:**
- Database query performance for session validation
- localStorage read/write performance
- Network latency for session checks

## Troubleshooting Common Issues

### Issue: Users complaining about frequent logouts
**Check:**
- Verify `SESSION_DURATION` is set correctly (8 hours)
- Check system clock on server and clients
- Review database logs for session updates

### Issue: Session monitoring not detecting replacements
**Check:**
- Verify `SESSION_CHECK_INTERVAL` is active (60 seconds)
- Check browser console for errors
- Verify database indexes were created
- Test database query performance

### Issue: Memory leak from monitoring
**Check:**
- Verify `stopSessionMonitoring()` is called on logout
- Check for multiple interval registrations
- Monitor JavaScript heap size over time

## Rollback Plan

If issues occur after deployment:

1. **Quick Fix - Disable Monitoring:**
   ```typescript
   // In authService.ts, comment out monitoring start
   // this.startSessionMonitoring();
   ```

2. **Revert to Simple Sessions:**
   ```sql
   -- Remove expiration column (optional)
   ALTER TABLE public.users DROP COLUMN IF EXISTS session_expires_at;
   ```
   Then revert `authService.ts` to previous version from git.

3. **Clear All Sessions:**
   ```sql
   UPDATE public.users SET session_id = NULL, session_expires_at = NULL;
   ```

## Support Resources

- **Documentation:** SESSION_MANAGEMENT_GUIDE.md
- **Migration File:** migrations/add_session_expiration.sql
- **Service Code:** src/services/authService.ts
- **Event Handling:** src/App.tsx (lines with session-expired/session-replaced)

## Success Criteria

✅ All users can log in successfully  
✅ Sessions expire after 8 hours  
✅ Concurrent logins handled properly  
✅ No memory leaks from monitoring  
✅ Fast page navigation (no flashing)  
✅ Clean logout process  
✅ No console errors  
✅ Good user experience  

Once all criteria met, session management is production-ready!

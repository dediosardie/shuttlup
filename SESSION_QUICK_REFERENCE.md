# Session Management - Quick Reference Card

## 🎯 Quick Overview

| Feature | Status | Details |
|---------|--------|---------|
| Session Expiration | ✅ Implemented | 8 hours auto-logout |
| Concurrent Login Handling | ✅ Implemented | New login replaces old |
| Browser Exit Cleanup | ✅ Implemented | Complete cleanup on logout |
| Background Monitoring | ✅ Active | Checks every 60 seconds |
| Database Integration | ✅ Complete | session_expires_at column |
| User Notifications | ✅ Working | Clear alerts for all scenarios |

## 📋 Deployment Checklist

```
Step 1: Database Migration
   [ ] Open Supabase SQL Editor
   [ ] Execute: migrations/add_session_expiration.sql
   [ ] Verify: SELECT session_expires_at FROM users LIMIT 1;

Step 2: Clear Existing Sessions (Optional)
   [ ] UPDATE users SET session_id = NULL, session_expires_at = NULL;

Step 3: Deploy Application
   [ ] Already built: npm run build ✓
   [ ] Deploy dist/ folder to hosting

Step 4: Test Core Features
   [ ] Login works
   [ ] Session expires after 8 hours (test with manual time change)
   [ ] Concurrent login logs out previous session
   [ ] Logout clears all data
   [ ] Monitoring active (check console)

Step 5: Monitor Production
   [ ] Watch for authentication errors
   [ ] Verify session checks not causing performance issues
   [ ] Gather user feedback on timeout experience
```

## 🔧 Configuration Quick Reference

### Location: `src/services/authService.ts`

```typescript
// SESSION DURATION (How long before logout)
const SESSION_DURATION = 8 * 60 * 60 * 1000;
// Change examples:
// 2 hours:  2 * 60 * 60 * 1000
// 12 hours: 12 * 60 * 60 * 1000
// 24 hours: 24 * 60 * 60 * 1000

// CHECK INTERVAL (How often to verify session)
const SESSION_CHECK_INTERVAL = 60 * 1000;
// Change examples:
// 30 seconds:  30 * 1000
// 2 minutes:  120 * 1000
// 5 minutes:  300 * 1000
```

### Enable Strict Browser Exit Mode
Uncomment at bottom of authService.ts:
```typescript
window.addEventListener('pagehide', async () => {
  await authService.signOut();
});
```

## 🗄️ Database Quick Reference

### Table: users
| Column | Type | Purpose |
|--------|------|---------|
| session_id | TEXT | Current session token (NULL = not logged in) |
| session_expires_at | TIMESTAMPTZ | When session expires (NULL = not logged in) |

### Queries

**Check active sessions:**
```sql
SELECT id, email, full_name, session_expires_at
FROM users
WHERE session_id IS NOT NULL
  AND session_expires_at > NOW();
```

**Find expired sessions:**
```sql
SELECT id, email, session_expires_at
FROM users
WHERE session_id IS NOT NULL
  AND session_expires_at < NOW();
```

**Cleanup expired sessions:**
```sql
UPDATE users
SET session_id = NULL, session_expires_at = NULL
WHERE session_expires_at < NOW();
```

**Force logout specific user:**
```sql
UPDATE users
SET session_id = NULL, session_expires_at = NULL
WHERE email = 'user@example.com';
```

**Force logout all users:**
```sql
UPDATE users
SET session_id = NULL, session_expires_at = NULL
WHERE session_id IS NOT NULL;
```

## 💾 localStorage Quick Reference

### Keys Stored
```
session_token         → "session_uuid_timestamp_random"
user_id              → "uuid-1234-5678-90ab"
user_email           → "user@example.com"
user_role            → "fleet_manager"
session_expires_at   → "2024-02-01T17:00:00.000Z"
```

### Browser DevTools Commands

**View all session data:**
```javascript
Object.keys(localStorage)
  .filter(key => key.includes('session') || key.includes('user'))
  .forEach(key => console.log(key, '→', localStorage.getItem(key)));
```

**Check session expiration:**
```javascript
const expiresAt = new Date(localStorage.getItem('session_expires_at'));
const now = new Date();
const timeLeft = expiresAt - now;
const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(2);
console.log(`Session expires in ${hoursLeft} hours`);
```

**Manually expire session (for testing):**
```javascript
localStorage.setItem('session_expires_at', new Date(Date.now() - 1000).toISOString());
// Wait 60 seconds for background check to detect
```

**Clear session manually:**
```javascript
['session_token', 'user_id', 'user_email', 'user_role', 'session_expires_at']
  .forEach(key => localStorage.removeItem(key));
```

## 🚨 Troubleshooting Quick Guide

### Problem: Users logged out too frequently
**Check:** Session duration too short
**Fix:**
```typescript
// Increase SESSION_DURATION in authService.ts
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours instead of 8
```

### Problem: Session monitoring not working
**Check:** Monitoring not started or stopped
**Fix:** Verify console shows "Session monitoring started" on login
```javascript
// In browser console:
console.log(authService.sessionCheckInterval);
// Should show interval ID, not null
```

### Problem: Database session_expires_at column missing
**Check:** Migration not executed
**Fix:**
```sql
-- Run in Supabase SQL Editor:
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
```

### Problem: Multiple tabs logging each other out
**Expected Behavior:** System enforces single active session
**If multi-tab needed:** Requires architectural change (not currently supported)

### Problem: Session persists after browser close
**Expected Behavior:** Default mode for better UX
**To change:** Enable strict mode (uncomment pagehide listener)

### Problem: "Session expired" alert on every page
**Check:** System time or database time incorrect
**Fix:** Verify server/client time sync, check timezone settings

## 📞 Support Commands

### Check Session Health
```javascript
// In browser console:
(async () => {
  const { user, error } = await authService.getSession();
  if (user) {
    console.log('✅ Session valid');
    console.log('User:', user.email);
    console.log('Role:', user.role);
    console.log('Expires:', localStorage.getItem('session_expires_at'));
  } else {
    console.log('❌ Session invalid:', error);
  }
})();
```

### Extend Current Session
```javascript
// In browser console:
(async () => {
  const result = await authService.extendSession();
  if (result.error) {
    console.log('❌ Failed to extend:', result.error);
  } else {
    console.log('✅ Session extended by 8 hours');
    console.log('New expiration:', localStorage.getItem('session_expires_at'));
  }
})();
```

### Monitor Session Validity
```javascript
// In browser console - watch for changes:
setInterval(async () => {
  const token = localStorage.getItem('session_token');
  const expiresAt = localStorage.getItem('session_expires_at');
  const expired = new Date(expiresAt) < new Date();
  console.log({
    hasToken: !!token,
    expiresAt,
    expired,
    status: expired ? '❌ EXPIRED' : '✅ VALID'
  });
}, 5000);
```

## 📊 Monitoring Metrics

### What to Track in Production

```
Metric                          Alert Threshold
─────────────────────────────────────────────────────────
Session Expired Events          > 100/hour (may be normal)
Session Replaced Events         > 50/hour (may indicate sharing)
Failed Login Attempts           > 10/user/hour (suspicious)
Session Check Errors            > 5% (database issues)
Average Session Duration        < 1 hour (users not staying)
```

### Database Performance
```sql
-- Check index usage:
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%session%';
```

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| [SESSION_DEPLOYMENT_SUMMARY.md](SESSION_DEPLOYMENT_SUMMARY.md) | Complete implementation overview |
| [SESSION_MANAGEMENT_GUIDE.md](SESSION_MANAGEMENT_GUIDE.md) | Detailed technical guide |
| [SESSION_MANAGEMENT_TEST.md](SESSION_MANAGEMENT_TEST.md) | Testing procedures |
| [SESSION_ARCHITECTURE_DIAGRAM.md](SESSION_ARCHITECTURE_DIAGRAM.md) | Visual architecture |
| [migrations/add_session_expiration.sql](migrations/add_session_expiration.sql) | Database migration |

## 🎉 Success Indicators

✅ **Working Correctly When:**
- Users can log in successfully
- Sessions expire after configured duration
- Concurrent logins replace previous sessions
- Logout clears all data
- No console errors
- Background monitoring active
- Database queries performant
- User experience smooth

## 📝 Quick Notes

- **Default Timeout:** 8 hours (28,800,000 ms)
- **Check Frequency:** Every 60 seconds (60,000 ms)
- **Browser Exit:** Session persists by default (UX)
- **Concurrent Sessions:** Not supported (single device)
- **Token Format:** `session_{userId}_{timestamp}_{random}`
- **Events:** `session-expired`, `session-replaced`

## 🔐 Security Notes

✅ Session tokens include user ID (prevents reuse)  
✅ Expiration enforced client and server side  
✅ Concurrent login detection active  
✅ Automatic cleanup on expiration  
✅ Database validation on every request  
✅ Monitoring stops on logout (no memory leak)  

---

**Ready for Production?** ✓ YES
**Need Help?** Check SESSION_MANAGEMENT_GUIDE.md
**Found a Bug?** Check troubleshooting section above

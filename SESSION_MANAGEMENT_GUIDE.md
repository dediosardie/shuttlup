# Session Management Implementation Guide

## Overview
This document describes the comprehensive session management system implemented in the Vehicle Maintenance Management System, including session expiration, concurrent login handling, and automatic cleanup.

## Features

### 1. Session Expiration
- **Duration**: 8 hours (configurable via `SESSION_DURATION` constant)
- **Storage**: Session expiration time stored in both:
  - Database: `session_expires_at` column in `users` table
  - Browser: `session_expires_at` in localStorage
- **Validation**: Checked both locally and server-side on every session validation

### 2. Concurrent Session Management
- **Single Device Login**: New login replaces existing session
- **Automatic Logout**: Users are automatically logged out when session is replaced by another login
- **Real-time Detection**: Background monitoring checks for session replacement every minute

### 3. Session Monitoring
- **Periodic Checks**: Every 60 seconds (configurable via `SESSION_CHECK_INTERVAL`)
- **Event-Driven**: Dispatches custom events for session expiration and replacement
- **Automatic Cleanup**: Stops monitoring on logout

### 4. Browser Exit Handling
- **On Logout**: Complete cleanup of localStorage and database session
- **On Browser Close**: Session data remains for potential refresh (security vs UX balance)
- **Optional Strict Mode**: Uncomment pagehide listener for forced re-login on tab close

## Implementation Details

### Database Schema

```sql
-- users table additions
ALTER TABLE public.users
ADD COLUMN session_expires_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX idx_users_session_expires_at 
ON public.users(session_expires_at) 
WHERE session_expires_at IS NOT NULL;

CREATE INDEX idx_users_session_validation
ON public.users(id, session_id, session_expires_at)
WHERE session_id IS NOT NULL;
```

### Authentication Flow

#### Sign In Process
1. User enters credentials
2. System validates password
3. **New**: Session token generated with expiration time (current time + 8 hours)
4. **Changed**: Existing session_id is replaced (no more "already logged in" error)
5. Session data stored in localStorage and database
6. Session monitoring starts automatically

#### Session Validation (getSession)
1. Check localStorage for session token and expiration
2. Validate expiration time locally (fast check)
3. Query database to verify session_id matches
4. **New**: Check if session was replaced by comparing session_id
5. **New**: Check database expiration time
6. Return user data or clear session if invalid

#### Sign Out Process
1. Stop session monitoring
2. Clear session_id and session_expires_at from database
3. Remove all session data from localStorage
4. Clear sessionStorage

### Session Monitoring

The system includes an active monitoring service that:

```typescript
// Started on login
authService.startSessionMonitoring();

// Checks every minute
setInterval(() => {
  checkSessionValidity();
}, SESSION_CHECK_INTERVAL);

// Stopped on logout
authService.stopSessionMonitoring();
```

#### Session Events

The monitoring system dispatches custom events:

```typescript
// Session expired
window.dispatchEvent(new CustomEvent('session-expired'));

// Session replaced by another device
window.dispatchEvent(new CustomEvent('session-replaced'));
```

These events are handled in `App.tsx` to automatically log out the user and show appropriate messages.

### Configuration

All session behavior can be configured via constants in `authService.ts`:

```typescript
// Session configuration
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute
```

### Storage Locations

#### localStorage
- `session_token`: Unique session identifier
- `user_id`: User's database ID
- `user_email`: User's email address
- `user_role`: User's role (for RBAC)
- `session_expires_at`: ISO timestamp of expiration

#### Database (users table)
- `session_id`: Current active session token (NULL if not logged in)
- `session_expires_at`: Timestamp when session expires (NULL if not logged in)

## User Experience

### Scenario: Session Expires
1. User is logged in and working
2. 8 hours pass
3. Background check detects expiration
4. User is automatically logged out
5. Alert shown: "Your session has expired. Please log in again."
6. Redirected to login page

### Scenario: Login from Another Device
1. User A is logged in on Device 1
2. User A logs in on Device 2
3. Device 2 replaces the session_id in database
4. Background check on Device 1 detects session_id mismatch
5. User A on Device 1 is automatically logged out
6. Alert shown: "Your account has been logged in from another device. You have been logged out."
7. Redirected to login page

### Scenario: Browser Close
1. User closes browser tab/window
2. localStorage data remains (for potential refresh/reopen)
3. Session will naturally expire after 8 hours
4. Or will be replaced on next login from any device

### Optional: Strict Security Mode
For environments requiring higher security, uncomment the pagehide listener in `authService.ts`:

```typescript
// Uncomment for stricter security (forces re-login on tab close)
window.addEventListener('pagehide', async () => {
  await authService.signOut();
});
```

This will immediately clear the session when the browser tab is closed or navigated away.

## API Methods

### authService Methods

```typescript
// Sign in with credentials
await authService.signIn(email, password);

// Sign out current user
await authService.signOut();

// Get current session (with validation)
await authService.getSession();

// Check if authenticated
await authService.isAuthenticated();

// Clear local session data only
authService.clearSession();

// Start session monitoring
authService.startSessionMonitoring();

// Stop session monitoring
authService.stopSessionMonitoring();

// Manually check session validity
await authService.checkSessionValidity();

// Extend session by 8 more hours
await authService.extendSession();
```

## Security Features

1. **No Session Stealing**: Session tokens include user ID, timestamp, and random string
2. **Expiration Enforcement**: Both client-side and server-side validation
3. **Concurrent Login Protection**: Automatic logout when session replaced
4. **Periodic Validation**: Active monitoring prevents stale sessions
5. **Database Validation**: Every request validates against database
6. **Automatic Cleanup**: Expired sessions cleared automatically

## Troubleshooting

### Issue: User keeps getting logged out
- **Cause**: Session duration too short or system clock issues
- **Solution**: Check `SESSION_DURATION` constant, verify system time is correct

### Issue: Session monitoring not working
- **Cause**: startSessionMonitoring() not called after login
- **Solution**: Verify signIn method includes `this.startSessionMonitoring()`

### Issue: Multiple tabs logging each other out
- **Current Behavior**: Expected - system enforces single active session
- **Solution**: If multi-tab support needed, implement tab-level session management

### Issue: User not logged out when closing browser
- **Current Behavior**: Expected - session persists for UX (auto-login on reopen)
- **Solution**: Enable strict mode by uncommenting pagehide listener

## Migration Instructions

1. **Run Database Migration**:
   ```sql
   -- Execute migrations/add_session_expiration.sql in your database
   ```

2. **Clear Existing Sessions** (Optional but recommended):
   ```sql
   UPDATE public.users
   SET session_id = NULL,
       session_expires_at = NULL
   WHERE session_id IS NOT NULL;
   ```
   This will force all users to log in again with the new session system.

3. **No Code Changes Required**:
   - `authService.ts` automatically handles new and old sessions
   - Old sessions without expiration will be handled gracefully

## Best Practices

1. **Session Duration**: Balance security vs UX (8 hours is standard for internal systems)
2. **Monitoring Interval**: Don't check too frequently (1 minute is reasonable)
3. **User Notifications**: Always inform users why they were logged out
4. **Graceful Degradation**: System works even if monitoring fails
5. **Browser Exit**: Default behavior favors UX; enable strict mode only if required

## Future Enhancements

Potential improvements to consider:

1. **Activity-Based Extension**: Auto-extend session on user activity
2. **Multi-Tab Support**: Share session across tabs from same device
3. **Session History**: Track login history and active sessions
4. **Remember Me**: Optional longer-lived sessions
5. **Two-Factor Authentication**: Additional security layer
6. **Session Analytics**: Track session duration, logout reasons, etc.

## Related Documentation

- [AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md) - Basic authentication setup
- [RBAC_IMPLEMENTATION_GUIDE.md](RBAC_IMPLEMENTATION_GUIDE.md) - Role-based access control
- [SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md) - Database configuration

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review authService.ts for implementation details
3. Check browser console for error messages
4. Verify database schema matches migration file

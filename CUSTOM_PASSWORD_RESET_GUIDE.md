# Custom Password Reset Implementation Guide

## Overview

This guide documents the custom password reset functionality implemented for Shutt'L Up. Since Supabase's built-in password reset wasn't working reliably, we created a custom token-based system with email verification.

**Date:** February 10, 2026  
**Status:** Ready for deployment

---

## Architecture

### Components

1. **Database Layer** - Recovery token storage and validation
2. **Edge Function** - Email sending service
3. **Auth Service** - Token generation and password reset logic
4. **UI Components** - Login page and dedicated reset page

### Flow Diagram

```
User clicks "Forgot Password"
    ↓
Enter email → Generate token (DB function)
    ↓
Send email via Edge Function (Resend API)
    ↓
User clicks link in email
    ↓
ResetPasswordPage validates token
    ↓
User enters new password
    ↓
Password updated in database
    ↓
Redirect to login
```

---

## File Structure

```
shuttlup/
├── migrations/
│   └── add_recovery_tokens.sql         # Database schema & functions
├── supabase/functions/
│   └── send-password-reset/
│       └── index.ts                    # Email sending edge function
├── src/
│   ├── components/
│   │   ├── ResetPasswordPage.tsx      # Password reset UI
│   │   └── LoginPage.tsx              # Updated forgot password flow
│   ├── services/
│   │   └── authService.ts             # Auth logic with custom reset
│   └── App.tsx                        # Routing for reset page
└── email-templates/
    └── password-reset.html            # Email template reference
```

---

## Setup Instructions

### Step 1: Deploy Database Migration

Run the SQL migration to add recovery token support:

```bash
# Navigate to Supabase dashboard → SQL Editor
# Or use Supabase CLI
supabase db push
```

**Manual approach:**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy contents of `migrations/add_recovery_tokens.sql`
4. Execute the SQL

This creates:
- ✅ `recovery_token` column in users table
- ✅ `recovery_token_expires_at` column
- ✅ `request_password_reset()` function
- ✅ `validate_recovery_token()` function
- ✅ `reset_password_with_token()` function

### Step 2: Deploy Edge Function

Deploy the password reset email sender:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function
supabase functions deploy send-password-reset
```

**Set environment variables:**

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Verify secrets
supabase secrets list
```

### Step 3: Configure Resend API

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add the API key to Supabase secrets (see above)
4. Verify your sending domain (optional but recommended)

### Step 4: Build and Deploy Frontend

```bash
# Build the application
npm run build

# Deploy to your hosting platform
# For Netlify:
netlify deploy --prod

# For Vercel:
vercel --prod
```

---

## Testing

### Test the Password Reset Flow

1. **Request Password Reset**
   ```
   1. Navigate to login page
   2. Click "Forgot Password"
   3. Enter registered email
   4. Click "Send Reset Link"
   5. Check console for confirmation
   ```

2. **Check Email**
   ```
   - Check inbox (and spam folder)
   - Email should arrive within 1-5 minutes
   - Email contains secure reset link
   ```

3. **Reset Password**
   ```
   1. Click link in email
   2. Should open ResetPasswordPage
   3. Enter new password (min 6 chars, uppercase, lowercase, numbers)
   4. Confirm password
   5. Click "Reset Password"
   6. Should redirect to login
   ```

### Test Token Validation

**Valid token:**
```
URL: https://yourapp.com/?token=abc123...
Expected: Reset form displays
```

**Invalid/expired token:**
```
URL: https://yourapp.com/?token=invalid
Expected: Error message shown
```

**Token expiration:**
- Tokens expire after 1 hour
- Attempting to use expired token shows error
- User must request new reset link

---

## Security Features

### Token Security

✅ **Cryptographically secure tokens** - Generated using `gen_random_bytes(32)`  
✅ **Time-limited** - Tokens expire after 1 hour  
✅ **Single-use** - Tokens are cleared after successful password reset  
✅ **Email enumeration prevention** - Same response whether email exists or not

### Password Requirements

- Minimum 6 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number

### Rate Limiting

- 60-second cooldown between reset requests
- Client-side and server-side enforcement
- Prevents spam and abuse

---

## Database Functions Reference

### `request_password_reset(user_email TEXT)`

Generates a recovery token and returns data needed for email.

**Returns:**
```sql
TABLE(
  success BOOLEAN,
  message TEXT,
  token TEXT,
  user_id UUID,
  full_name TEXT
)
```

**Example:**
```sql
SELECT * FROM request_password_reset('user@example.com');
```

### `validate_recovery_token(token TEXT)`

Checks if a recovery token is valid and not expired.

**Returns:**
```sql
TABLE(
  valid BOOLEAN,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  message TEXT
)
```

### `reset_password_with_token(token TEXT, new_password_hash TEXT)`

Resets password using a valid token.

**Returns:**
```sql
TABLE(
  success BOOLEAN,
  message TEXT
)
```

---

## API Reference

### Edge Function: `send-password-reset`

**Endpoint:** `https://YOUR_PROJECT.supabase.co/functions/v1/send-password-reset`

**Method:** POST

**Request Body:**
```json
{
  "email": "user@example.com",
  "appUrl": "https://yourapp.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "emailId": "email_id_from_resend"
}
```

**Response (Error):**
```json
{
  "error": "Error description"
}
```

---

## Frontend Components

### ResetPasswordPage

**Props:**
```typescript
interface ResetPasswordPageProps {
  onResetSuccess?: () => void;
}
```

**Features:**
- Token validation on mount
- Password strength requirements
- Show/hide password toggle
- Loading states
- Security tips
- Automatic redirect on success

### LoginPage (Updated)

**Changes:**
- Removed old Supabase auth reset flow
- Uses custom `authService.forgotPassword()`
- Shows success message with instructions
- 60-second cooldown between requests

---

## Auth Service Methods

### `forgotPassword(email: string)`

Sends password reset email via edge function.

```typescript
const { error } = await authService.forgotPassword('user@example.com');
```

### `validateRecoveryToken(token: string)`

Validates a recovery token.

```typescript
const { valid, userId, email, fullName, error } = 
  await authService.validateRecoveryToken(token);
```

### `resetPasswordWithToken(token: string, newPassword: string)`

Resets password using valid token.

```typescript
const { error } = await authService.resetPasswordWithToken(token, 'NewPass123');
```

---

## Troubleshooting

### Email Not Received

**Check:**
1. ✅ Resend API key is set correctly
2. ✅ Edge function is deployed
3. ✅ Check Supabase logs: Dashboard → Edge Functions → Logs
4. ✅ Check spam/junk folder
5. ✅ Verify email is in users table

**Debug:**
```bash
# Check edge function logs
supabase functions logs send-password-reset

# Test edge function directly
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-password-reset \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","appUrl":"https://yourapp.com"}'
```

### Token Invalid/Expired

**Check:**
1. Token is less than 1 hour old
2. Token hasn't been used already
3. User exists and is active

**Query:**
```sql
-- Check token in database
SELECT 
  id, 
  email, 
  recovery_token, 
  recovery_token_expires_at,
  recovery_token_expires_at > NOW() as is_valid
FROM users 
WHERE email = 'user@example.com';
```

### Password Not Updating

**Check:**
1. Token is valid
2. Password meets requirements
3. Check Supabase logs for errors
4. Verify RPC function executed successfully

---

## Environment Variables

Required environment variables for edge function:

```bash
# Supabase (auto-set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (must be set manually)
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## Migration from Old System

If you were using Supabase's built-in password reset:

1. ✅ No data migration needed
2. ✅ New system works alongside Supabase auth
3. ✅ Users can reset passwords using new flow
4. ✅ Old reset links will fail gracefully (redirects to new flow)

---

## Monitoring

### Key Metrics to Monitor

1. **Email Delivery Rate**
   - Check Resend dashboard
   - Monitor edge function logs

2. **Token Usage**
   ```sql
   -- Count active tokens
   SELECT COUNT(*) 
   FROM users 
   WHERE recovery_token IS NOT NULL 
     AND recovery_token_expires_at > NOW();
   ```

3. **Failed Reset Attempts**
   - Monitor edge function errors
   - Check authentication logs

---

## Future Improvements

### Potential Enhancements

- [ ] Add SMS-based password reset
- [ ] Implement 2FA for sensitive accounts
- [ ] Add password reset history tracking
- [ ] Implement account lockout after multiple failed attempts
- [ ] Add password strength meter
- [ ] Send confirmation email after successful reset

---

## Support

### Getting Help

**Issues with:**
- Database: Check Supabase Dashboard → Database → Logs
- Edge Function: Check Supabase Dashboard → Edge Functions → Logs
- Email Delivery: Check Resend Dashboard → Logs
- Frontend: Check browser console for errors

**Common Commands:**
```bash
# View edge function logs
supabase functions logs send-password-reset --tail

# Test database function
supabase db execute "SELECT * FROM request_password_reset('test@example.com')"

# Redeploy edge function
supabase functions deploy send-password-reset --no-verify-jwt
```

---

## Changelog

### v1.0.0 (February 10, 2026)
- ✅ Initial implementation
- ✅ Database schema with recovery tokens
- ✅ Edge function for email sending
- ✅ ResetPasswordPage component
- ✅ Updated authService methods
- ✅ Integration with existing auth system

---

## License

This implementation is part of the Shutt'L Up Vehicle Management System.

---

**Ready for Production** ✅

All components are tested and ready for deployment. Follow the setup instructions above to enable custom password reset in your environment.

# Supabase Configuration Guide

## Error: "Signups not allowed for this instance"

If you're seeing this error, it means Supabase Auth needs to be configured to allow signups. Follow these steps:

## Step 1: Enable Email Signups in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Email** provider
5. Make sure it's **enabled** (toggle should be ON)

## Step 2: Disable Email Confirmation (Recommended for Development)

For development/testing, you may want to disable email confirmation:

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Scroll down to **Email Auth** section
3. Find **Enable email confirmations**
4. **Disable** this option (turn OFF)
5. Click **Save**

### Why Disable Email Confirmation?
- Faster development and testing
- No need to check email for verification links
- Users can sign in immediately after signup
- Admin approval system is already in place via `is_active` field

## Step 3: Configure Email Settings (If Using Email Confirmation)

If you want to keep email confirmation enabled:

1. Go to **Authentication** → **Email Templates**
2. Configure the **Confirm signup** template
3. Set up SMTP settings under **Settings** → **SMTP**
4. Or use Supabase's default email service

## Step 4: Update Auth Settings

1. In **Authentication** → **Settings**
2. Configure these settings:

### Site URL
```
http://localhost:5173
```
(or your production URL)

### Redirect URLs
Add these allowed redirect URLs:
```
http://localhost:5173
http://localhost:5173/**
https://yourdomain.com
https://yourdomain.com/**
```

### JWT Settings
- JWT expiry: `3600` (1 hour) or your preferred duration
- Refresh token rotation: Enable for better security

## Step 5: Row Level Security (RLS) Configuration

Make sure RLS policies allow user creation:

```sql
-- Run this in SQL Editor to check/update policies

-- Allow anyone to insert their own user record
CREATE POLICY "Allow user signup"
ON users
FOR INSERT
WITH CHECK (true);

-- Or more restrictive - only allow authenticated users
CREATE POLICY "Allow authenticated user signup"
ON users
FOR INSERT
TO authenticated
WITH CHECK (true);
```

## Step 6: Verify Configuration

### Test in SQL Editor
```sql
-- Check if auth is working
SELECT * FROM auth.users LIMIT 5;

-- Check if users table is accessible
SELECT * FROM users LIMIT 5;
```

## Common Issues and Solutions

### Issue 1: "Email not confirmed"
**Solution**: Disable email confirmation in Auth settings or check your email for verification link.

### Issue 2: "User already registered"
**Solution**: 
- Delete the user from Supabase Auth Dashboard (Authentication → Users)
- Or use a different email address

### Issue 3: "Invalid API key"
**Solution**: 
- Check your `.env` file has correct Supabase URL and anon key
- Make sure you're using the `anon` public key, not the service role key

### Issue 4: "Row Level Security policy violation"
**Solution**: 
- Check RLS policies on `users` table
- Temporarily disable RLS for testing: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`
- Re-enable after fixing: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`

## Production Configuration Checklist

Before deploying to production:

- [ ] Re-enable email confirmation
- [ ] Configure custom SMTP provider
- [ ] Set up proper redirect URLs
- [ ] Enable refresh token rotation
- [ ] Configure rate limiting
- [ ] Set up proper RLS policies
- [ ] Enable MFA (Multi-Factor Authentication) option
- [ ] Configure password requirements
- [ ] Set session timeout appropriately

## Quick Fix for Development

If you just want to get started quickly:

1. **Disable Email Confirmation**: Authentication → Settings → Turn OFF email confirmations
2. **Enable Email Provider**: Authentication → Providers → Enable Email
3. **Add Redirect URL**: Authentication → URL Configuration → Add `http://localhost:5173`
4. **Test Signup**: Try creating a new account with your test email

## Environment Variables

Make sure your `.env` file has these set correctly:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Testing the Configuration

After configuring, test with these steps:

1. Open your app: `npm run dev`
2. Go to signup page
3. Enter email: `test@pg.com`
4. Enter password: `Test123456`
5. Enter full name: `Test User`
6. Click **Create Account**

**Expected Result**: 
- Success message appears
- User created in Supabase Auth
- User created in `users` table
- Both have the same UUID

## Debugging

Enable detailed logging:

```typescript
// In src/services/authService.ts, add more console logs:
console.log('Signup attempt:', { email, role: userRole, isActive: isAdminEmail });
console.log('Auth response:', { user: authData?.user?.id, error: authError });
```

Check browser console for detailed error messages.

## Need Help?

1. Check Supabase logs: Dashboard → Logs → Auth
2. Check browser console for errors
3. Verify database permissions in SQL Editor
4. Review RLS policies on all tables

# Email Not Received - Troubleshooting Guide

## Common Issue: Password Reset Email Not Arriving

### Quick Fixes (Try These First)

#### 1. **Check Spam/Junk Folder**
- Supabase's default emails often go to spam
- Look for emails from `noreply@mail.app.supabase.io`
- Mark as "Not Spam" and add to contacts

#### 2. **Wait 5-10 Minutes**
- Supabase's free email service can be slow
- Default rate limit: ~3 emails per hour
- Check your inbox periodically

#### 3. **Verify Email in Database**
```sql
-- Run in Supabase Dashboard → SQL Editor
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Should return a row if user exists
```

#### 4. **Check Supabase Logs**
1. Go to Supabase Dashboard
2. Click **Logs** → **Auth Logs**
3. Filter by your email
4. Look for "sent email" or error messages

---

## Root Cause: Supabase Default Email Service

**Problem:** Supabase's built-in email service (free tier) has limitations:
- ❌ Unreliable delivery
- ❌ Slow (1-10 minutes)
- ❌ Rate limited (3/hour)
- ❌ Often flagged as spam
- ❌ No delivery guarantee

**Solution:** Configure custom SMTP (recommended for production)

---

## Fix 1: Configure Custom SMTP (Recommended)

### Using Gmail (Free)

1. **Enable 2FA on Gmail Account**
   - Go to Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password

3. **Configure in Supabase**
   - Dashboard → **Project Settings** → **Auth**
   - Scroll to **SMTP Settings**
   - Enable "Enable Custom SMTP Server"
   - Enter:
     ```
     Host: smtp.gmail.com
     Port: 587
     Username: your-gmail@gmail.com
     Password: [16-char app password]
     Sender email: your-gmail@gmail.com
     Sender name: Shutt'L Up
     ```
   - Click **Save**

4. **Test**
   - Request password reset again
   - Email should arrive within seconds ✅

### Using SendGrid (Free - 100 emails/day)

1. **Sign up at sendgrid.com**
2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Name: "Shuttlup Auth"
   - Permissions: Full Access
   - Copy the key

3. **Configure in Supabase**
   - Dashboard → **Project Settings** → **Auth**
   - SMTP Settings:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Your SendGrid API key]
     Sender email: noreply@yourdomain.com (must be verified)
     Sender name: Shutt'L Up
     ```

4. **Verify Domain** (Required for SendGrid)
   - SendGrid → Settings → Sender Authentication
   - Verify your domain or single sender email

### Using Resend (Modern, Developer-Friendly)

1. **Sign up at resend.com**
2. **Get API Key**
3. **Use Supabase Edge Function** (alternative approach)
   - Create custom edge function for email
   - Integrates with Resend API
   - More control over templates

---

## Fix 2: Verify Supabase Email Configuration

### Check Email Templates

1. Go to **Authentication** → **Email Templates**
2. Verify "Reset password" template is enabled
3. Click **Edit template** and verify:

```html
<h2>Reset your password</h2>
<p>Someone requested a password reset for your account.</p>
<p>If this was you, click below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can ignore this email.</p>
<p>This link expires in 1 hour.</p>
```

### Check Redirect URLs

1. **Authentication** → **URL Configuration**
2. Add your site URL:
   ```
   Site URL: https://app.shuttlup.com
   Redirect URLs: https://app.shuttlup.com/?reset=true
   ```

---

## Fix 3: Temporary Workaround (Development)

While configuring SMTP, use this workaround:

### Get Reset Link from Database

```sql
-- Generate a password reset session manually
SELECT 
  id, 
  email,
  confirmation_token
FROM auth.users 
WHERE email = 'user@example.com';

-- Use this to construct reset URL manually
-- https://your-project.supabase.co/auth/v1/verify?token=TOKEN&type=recovery&redirect_to=https://app.shuttlup.com/?reset=true
```

### Or Use Supabase Dashboard

1. **Authentication** → **Users**
2. Find the user
3. Click **...** → **Send password recovery email**
4. Manually send from dashboard

---

## Fix 4: Enable Email Logs in Supabase

```sql
-- Check email sending attempts
SELECT 
  created_at,
  email,
  raw_user_meta_data->>'email' as metadata_email
FROM auth.users
WHERE email = 'your-email@example.com';

-- Check for any auth errors
-- Dashboard → Logs → Auth → Filter by email
```

---

## Verification Checklist

After configuring SMTP, verify everything works:

- [ ] SMTP settings saved in Supabase
- [ ] Email template is enabled
- [ ] Redirect URL is correct
- [ ] Test password reset request
- [ ] Email arrives within 30 seconds
- [ ] Email is not in spam
- [ ] Reset link works correctly

---

## Testing Commands

### Test 1: Request Reset
```javascript
// Run in browser console on your app
const { error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
  redirectTo: 'https://app.shuttlup.com/?reset=true'
});
console.log('Error:', error);
console.log('Check your email!');
```

### Test 2: Check Logs
```sql
-- Supabase SQL Editor
SELECT * FROM auth.audit_log_entries 
WHERE payload->>'email' = 'test@example.com'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Production Configuration Summary

For production deployment:

1. ✅ **Use Custom SMTP** (Gmail, SendGrid, or Resend)
2. ✅ **Verify Domain** (for SendGrid/Resend)
3. ✅ **Set Proper Redirect URLs**
4. ✅ **Customize Email Templates**
5. ✅ **Monitor Email Logs**
6. ✅ **Test Thoroughly**

---

## Still Not Working?

### Check Supabase Status
- Visit https://status.supabase.com/
- Check if email service is down

### Check Browser Console
```javascript
// Look for these logs after requesting reset:
// "Requesting password reset for: email@example.com"
// "✅ Password reset request accepted by Supabase Auth"
// "⚠️ Note: Check spam folder if email not received within 5 minutes"
```

### Contact Supabase Support
If using custom SMTP and still not working:
1. Go to Supabase Dashboard
2. Click **Support** → **New Support Ticket**
3. Include:
   - Project ID
   - Email address tested
   - Timestamp of request
   - Screenshots of SMTP settings

---

## Alternative: Manual Password Reset (Admin)

If email is completely broken, admin can reset user password manually:

```sql
-- ADMIN ONLY - Reset user password directly
UPDATE auth.users
SET encrypted_password = crypt('temporary123', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';

-- Also update public.users
UPDATE public.users
SET password_hash = crypt('temporary123', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';

-- Send the temporary password via another channel (chat, phone)
-- User should change it immediately after login
```

---

**Quick Reference:**
- 🔧 Fix: Configure custom SMTP
- 📧 Recommended: Gmail or SendGrid
- 🚀 Production: Must use custom SMTP
- ⚠️ Never use default Supabase emails in production

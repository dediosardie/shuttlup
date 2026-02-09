# Password Reset Email Template Setup Guide

## Step 1: Configure in Supabase Dashboard

### A. Navigate to Email Templates
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **btsdfmfifqahijazssmy**
3. Click **Authentication** in the left sidebar
4. Click **Email Templates**

### B. Edit the Reset Password Template
1. Find **"Reset password"** in the list
2. **Enable the template** (toggle should be ON)
3. Click **Edit** on the Reset Password template
4. Replace the content with the HTML template from `password-reset.html`

### C. Important Configuration
- **Subject Line:** `Reset your Shutt'L Up password`
- **Sender Name:** `Shutt'L Up` (or your preferred name)
- **Sender Email:** Use your configured domain email (same as signup)

---

## Step 2: Configure Redirect URL

### A. Add Redirect URL to Allowed List
1. Still in **Authentication** settings
2. Click **URL Configuration** tab
3. Under **Redirect URLs**, add:
   ```
   https://yourdomain.com/?reset=true
   http://localhost:5173/?reset=true  (for development)
   ```
4. Replace `yourdomain.com` with your actual domain
5. Click **Save**

### B. Update Site URL (if not already set)
- **Site URL:** `https://yourdomain.com`
- This should match your production URL

---

## Step 3: Test the Email

### A. Request Password Reset
1. Go to your app's login page
2. Click "Forgot Password?"
3. Enter your email address
4. Click "Send Reset Link"

### B. Check Browser Console
You should see:
```
Requesting password reset for: your@email.com
User found, sending reset email via Supabase Auth...
✅ Password reset request accepted by Supabase Auth
⚠️ Note: Check spam folder if email not received within 5 minutes
```

### C. Check Your Inbox
- Email should arrive within 5-30 seconds (since you're using custom SMTP)
- Subject: "Reset your Shutt'L Up password"
- Sender: Your configured domain email
- Click the "Reset Password" button
- Should redirect to your app with `?reset=true` parameter

---

## Step 4: Verify Password Reset Flow

### A. After Clicking Email Link
1. Should redirect to: `https://yourdomain.com/?reset=true`
2. URL may also have: `#access_token=...&type=recovery`
3. Your app should detect this and show password reset form

### B. Complete Password Reset
1. Enter new password
2. Click "Update Password"
3. Password should be updated in both:
   - `auth.users` (Supabase Auth)
   - `public.users` (via database trigger)

### C. Verify Login with New Password
1. Redirected to login page
2. Enter email and new password
3. Should successfully log in

---

## Troubleshooting

### Email Not Received?
1. **Check Spam/Junk folder** first
2. **Verify template is enabled** in Supabase Dashboard
3. **Check Supabase Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for email sending events
4. **Verify SMTP settings** are correct (same as signup)
5. **Check redirect URL** is in allowed list

### Email Received But Link Doesn't Work?
1. **Check redirect URL** matches exactly:
   - Should be: `https://yourdomain.com/?reset=true`
   - Not: `https://yourdomain.com/reset` or other variations
2. **Verify URL Configuration** in Supabase is correct
3. **Check browser console** for errors

### Password Reset Form Not Showing?
1. **Check LoginPage.tsx** useEffect:
   ```typescript
   useEffect(() => {
     const urlParams = new URLSearchParams(window.location.search);
     const hashParams = new URLSearchParams(window.location.hash.substring(1));
     
     if (urlParams.get('reset') === 'true' || hashParams.get('type') === 'recovery') {
       setShowResetForm(true);
     }
   }, []);
   ```
2. **Check URL** has correct parameters

### Password Updated But Can't Login?
1. **Check database trigger** is deployed:
   - Run migration: `migrations/sync_auth_password_trigger.sql`
2. **Verify trigger exists** in Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'sync_password_to_public';
   ```
3. **Manually sync if needed:**
   ```sql
   -- Check if passwords match
   SELECT 
     au.email,
     au.encrypted_password as auth_password,
     pu.password_hash as public_password
   FROM auth.users au
   JOIN public.users pu ON au.id = pu.id
   WHERE au.email = 'test@example.com';
   ```

---

## Email Template Customization

### Change Logo
Replace the logo div with an image:
```html
<div class="header">
    <img src="https://yourdomain.com/logo.png" alt="Shutt'L Up" style="max-width: 150px; height: auto;">
</div>
```

### Change Colors
Update the CSS variables:
```css
.button {
    background-color: #2563eb;  /* Change this to your brand color */
}
.logo {
    color: #2563eb;  /* Change this to match */
}
```

### Change Expiration Time
Default is 1 hour. To change in Supabase:
1. Dashboard → Authentication → Policies
2. Look for JWT expiration settings
3. Default cannot be changed for password reset tokens (1 hour is standard)

### Add Company Address/Legal Info
Add before closing `</div>` of container:
```html
<p style="font-size: 12px; color: #9ca3af; text-align: center;">
    Shutt'L Up Transport Services<br>
    123 Main Street, City, Country<br>
    © 2026 All rights reserved
</p>
```

---

## Production Checklist

Before deploying to production:

- [ ] Email template enabled in Supabase
- [ ] Subject line is clear and professional
- [ ] Sender email matches your domain
- [ ] Redirect URL points to production domain
- [ ] Site URL is set correctly
- [ ] Tested password reset flow end-to-end
- [ ] Database trigger deployed and verified
- [ ] Email arrives within 30 seconds
- [ ] Password reset link works
- [ ] New password allows login
- [ ] Both databases (auth + public) are synced

---

## Quick Test Command

Run in browser console after requesting reset:
```javascript
// Check if URL detection works
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.substring(1));
console.log('URL reset param:', urlParams.get('reset'));
console.log('Hash type param:', hashParams.get('type'));
console.log('Should show reset form:', 
  urlParams.get('reset') === 'true' || hashParams.get('type') === 'recovery'
);
```

---

## Support

If you encounter issues:
1. Check Supabase Dashboard → Logs for detailed error messages
2. Check browser console for client-side errors
3. Verify SMTP configuration (should be same as signup)
4. Test with multiple email providers (Gmail, Outlook, etc.)

**Remember:** Since signup emails work, SMTP is configured correctly. The issue is likely just enabling the template or setting the redirect URL.

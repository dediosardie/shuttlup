# Password Reset Deployment Checklist

## Pre-Deployment

### ✅ Code Review
- [ ] Review all changed files
- [ ] Check for TypeScript errors: `npm run build`
- [ ] Test locally if possible
- [ ] Review security implications

### ✅ Prerequisites
- [ ] Supabase project is set up
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Resend account created (free tier works)
- [ ] Resend API key obtained
- [ ] Git changes committed

---

## Deployment Steps

### Step 1: Database Migration (Required)

**Option A: Supabase Dashboard (Recommended)**
```
1. Open Supabase Dashboard
2. Navigate to: SQL Editor → New Query
3. Copy entire contents of: migrations/add_recovery_tokens.sql
4. Click "Run" button
5. Verify success message appears
6. Check output - should see column confirmations
```

**Option B: Supabase CLI**
```bash
supabase db push
```

**Verification:**
```sql
-- Run this in SQL Editor to verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('recovery_token', 'recovery_token_expires_at');

-- Should return 2 rows
```

- [ ] Database migration executed successfully
- [ ] Verification query returns 2 rows

---

### Step 2: Configure Resend

1. **Get API Key**
   ```
   1. Go to https://resend.com
   2. Sign up or log in
   3. Navigate to API Keys
   4. Click "Create API Key"
   5. Copy the key (starts with re_)
   ```

2. **Set Domain (Optional but recommended)**
   ```
   1. In Resend dashboard, go to Domains
   2. Click "Add Domain"
   3. Add your domain (e.g., shuttlup.com)
   4. Follow DNS setup instructions
   5. Verify domain
   ```

- [ ] Resend account created
- [ ] API key obtained
- [ ] Domain configured (optional)

---

### Step 3: Deploy Edge Function

**Login to Supabase CLI:**
```bash
# First time setup
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Deploy Function:**
```bash
# Navigate to project root
cd d:\Projects\shuttlup

# Deploy the function
supabase functions deploy send-password-reset

# Should see: "Deployed Function send-password-reset"
```

**Set Secrets:**
```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Verify it was set
supabase secrets list

# Should see: RESEND_API_KEY (masked)
```

**Test Function:**
```bash
# Get your anon key from Supabase Dashboard → Settings → API
# Test the function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-password-reset \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","appUrl":"https://yourapp.com"}'

# Should return: {"success":true,...}
```

- [ ] Edge function deployed
- [ ] Resend API key set as secret
- [ ] Function test successful

---

### Step 4: Build Frontend

```bash
# Navigate to project root
cd d:\Projects\shuttlup

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Should complete without errors
```

**Check for errors:**
- [ ] TypeScript compilation successful
- [ ] No build errors
- [ ] `dist/` folder created

---

### Step 5: Deploy Frontend

**For Netlify:**
```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Or use Netlify Dashboard to deploy from Git
```

**For Vercel:**
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy
vercel --prod

# Or use Vercel Dashboard to deploy from Git
```

**For Manual Hosting:**
```bash
# Copy dist/ folder contents to your web server
# Example with rsync:
rsync -avz dist/ user@yourserver:/var/www/shuttlup/
```

- [ ] Frontend deployed successfully
- [ ] Application accessible via URL

---

## Post-Deployment Testing

### Test 1: Request Password Reset

1. Navigate to your app URL
2. Click "Forgot Password"
3. Enter a valid user email
4. Click "Send Reset Link"
5. Should see success message

**Check:**
- [ ] Success message appears
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

### Test 2: Email Delivery

1. Check email inbox (use email from Test 1)
2. Wait up to 5 minutes
3. Check spam/junk folder if not in inbox

**Email should contain:**
- [ ] Shutt'L Up branding
- [ ] "Reset Password" button
- [ ] Working reset link
- [ ] Security notice

**If email not received, check:**
```bash
# Check edge function logs
supabase functions logs send-password-reset

# Check Resend dashboard
# https://resend.com/emails
```

### Test 3: Reset Password

1. Click link in reset email
2. Should open ResetPasswordPage
3. Enter new password (e.g., "Test123456")
4. Confirm password
5. Click "Reset Password"
6. Should see success and redirect

**Check:**
- [ ] Reset page loads correctly
- [ ] Token is validated
- [ ] Password form displays
- [ ] Password can be changed
- [ ] Success message appears
- [ ] Redirect to login works

### Test 4: Login with New Password

1. On login page, enter email
2. Enter NEW password (from Test 3)
3. Click "Sign In"
4. Should log in successfully

**Check:**
- [ ] New password works
- [ ] Old password does NOT work
- [ ] User can access application

### Test 5: Token Expiration

1. Request password reset
2. Get token from email link
3. Wait 1+ hours (or manually expire in DB)
4. Try to use reset link
5. Should see "expired token" error

**Manual expiration test:**
```sql
-- Force expire a token for testing
UPDATE users 
SET recovery_token_expires_at = NOW() - INTERVAL '1 hour'
WHERE email = 'test@example.com';
```

- [ ] Expired token shows error
- [ ] User can request new link

### Test 6: Rate Limiting

1. Request password reset
2. Immediately request another (within 60 seconds)
3. Should see cooldown message

**Check:**
- [ ] Cooldown enforced on client
- [ ] Countdown timer shows remaining seconds
- [ ] Can request again after 60 seconds

---

## Monitoring Setup

### Enable Monitoring

1. **Supabase Dashboard**
   ```
   - Go to Logs → Edge Functions
   - Filter for "send-password-reset"
   - Pin to dashboard
   ```

2. **Resend Dashboard**
   ```
   - Go to Emails
   - Monitor delivery status
   - Set up email notifications (optional)
   ```

3. **Database Monitoring**
   ```sql
   -- Create view for password reset monitoring
   CREATE OR REPLACE VIEW password_reset_stats AS
   SELECT 
     COUNT(*) as active_tokens,
     COUNT(*) FILTER (WHERE recovery_token_expires_at < NOW()) as expired_tokens,
     MAX(recovery_token_expires_at) as latest_expiry
   FROM users 
   WHERE recovery_token IS NOT NULL;
   ```

- [ ] Logging enabled
- [ ] Monitoring dashboard set up
- [ ] Alerts configured (optional)

---

## Rollback Plan

If issues occur, follow these steps:

### Quick Rollback

1. **Disable Edge Function**
   ```bash
   # Doesn't delete, just makes unavailable
   supabase functions delete send-password-reset
   ```

2. **Revert Frontend**
   ```bash
   # Deploy previous version
   git checkout <previous-commit>
   npm run build
   # Deploy using your method
   ```

3. **Database (only if major issues)**
   ```sql
   -- Remove recovery token columns (only if necessary)
   ALTER TABLE users DROP COLUMN IF EXISTS recovery_token;
   ALTER TABLE users DROP COLUMN IF EXISTS recovery_token_expires_at;
   
   -- Drop functions
   DROP FUNCTION IF EXISTS request_password_reset;
   DROP FUNCTION IF EXISTS validate_recovery_token;
   DROP FUNCTION IF EXISTS reset_password_with_token;
   ```

- [ ] Rollback plan understood
- [ ] Previous version tagged in git

---

## Success Criteria

All checkboxes below should be ✅ before considering deployment complete:

### Functionality
- [ ] Users can request password reset
- [ ] Emails are delivered reliably
- [ ] Reset links work correctly
- [ ] Passwords can be changed
- [ ] New passwords work for login
- [ ] Old passwords don't work
- [ ] Expired tokens show error
- [ ] Rate limiting works

### Performance
- [ ] Email delivery < 5 minutes
- [ ] Page load times acceptable
- [ ] No significant server load increase

### Security
- [ ] Tokens expire after 1 hour
- [ ] Tokens are single-use
- [ ] Rate limiting prevents abuse
- [ ] Password requirements enforced
- [ ] No email enumeration possible

### Monitoring
- [ ] Can view edge function logs
- [ ] Can track email delivery
- [ ] Can monitor token usage
- [ ] Alerts configured (if needed)

---

## Documentation

- [ ] CUSTOM_PASSWORD_RESET_GUIDE.md reviewed
- [ ] PASSWORD_RESET_QUICK_REFERENCE.md reviewed
- [ ] Team notified of new feature
- [ ] User documentation updated (if applicable)

---

## Sign-Off

**Deployment Date:** _________________

**Deployed By:** _________________

**Verified By:** _________________

**Production URL:** _________________

**Issues Encountered:** 
```
(None / List any issues)
```

**Notes:**
```
(Any additional notes or observations)
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check email delivery rate in Resend
- [ ] Review edge function logs for errors
- [ ] Monitor password reset frequency

**Monthly:**
- [ ] Clean up expired tokens (optional)
  ```sql
  UPDATE users 
  SET recovery_token = NULL, recovery_token_expires_at = NULL
  WHERE recovery_token_expires_at < NOW() - INTERVAL '7 days';
  ```

**As Needed:**
- [ ] Rotate Resend API key
- [ ] Update email template
- [ ] Adjust token expiration time
- [ ] Update password requirements

---

**Deployment Status:** 🟡 In Progress / 🟢 Complete / 🔴 Failed

**Ready for Production:** ⬜ Yes / ⬜ No

---

For questions or issues, refer to:
- [CUSTOM_PASSWORD_RESET_GUIDE.md](./CUSTOM_PASSWORD_RESET_GUIDE.md)
- [PASSWORD_RESET_QUICK_REFERENCE.md](./PASSWORD_RESET_QUICK_REFERENCE.md)

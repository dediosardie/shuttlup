# Password Reset - Quick Reference

## 🚀 Quick Start

### For Developers

**Deploy in 3 steps:**

```bash
# 1. Run database migration
# Copy migrations/add_recovery_tokens.sql to Supabase SQL Editor and execute

# 2. Deploy edge function
supabase functions deploy send-password-reset
supabase secrets set RESEND_API_KEY=your_resend_api_key

# 3. Build and deploy frontend
npm run build
```

### For Users

**Reset your password:**

1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Check email (and spam) for reset link
5. Click link and enter new password
6. Password reset! Log in with new credentials

---

## 📁 Files Changed/Created

### New Files
- ✅ `migrations/add_recovery_tokens.sql` - Database schema
- ✅ `supabase/functions/send-password-reset/index.ts` - Email sender
- ✅ `src/components/ResetPasswordPage.tsx` - Reset UI
- ✅ `CUSTOM_PASSWORD_RESET_GUIDE.md` - Full documentation

### Modified Files
- ✅ `src/services/authService.ts` - Added custom reset methods
- ✅ `src/components/LoginPage.tsx` - Cleaned up old reset code
- ✅ `src/App.tsx` - Added reset page routing

---

## 🔑 Key Functions

### Database

```sql
-- Generate token and get user info for email
SELECT * FROM request_password_reset('user@example.com');

-- Validate token
SELECT * FROM validate_recovery_token('token_string');

-- Reset password
SELECT * FROM reset_password_with_token('token_string', 'hashed_password');
```

### Frontend

```typescript
// Request password reset
await authService.forgotPassword('user@example.com');

// Validate token
const { valid, error } = await authService.validateRecoveryToken(token);

// Reset password
await authService.resetPasswordWithToken(token, 'NewPassword123');
```

---

## ⚠️ Important Notes

### Security
- ✅ Tokens expire in 1 hour
- ✅ Tokens are single-use
- ✅ 60-second cooldown between requests
- ✅ Password requires: uppercase, lowercase, numbers, 6+ chars

### Email Delivery
- ⏱️ Emails may take 1-5 minutes
- 📧 Check spam folder
- 🔄 Wait 60 seconds before requesting another

### Environment Variables
```bash
# Required in Supabase
RESEND_API_KEY=re_xxxxx  # Get from resend.com
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not received | Check spam, verify Resend API key, check edge function logs |
| Token invalid | Check expiration (1 hour), verify token in database |
| Edge function error | Check secrets: `supabase secrets list` |
| Password not updating | Verify token is valid, check password requirements |

### Debug Commands

```bash
# Check edge function logs
supabase functions logs send-password-reset

# Test edge function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-password-reset \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@test.com","appUrl":"https://yourapp.com"}'

# Check active tokens
SELECT email, recovery_token_expires_at FROM users WHERE recovery_token IS NOT NULL;
```

---

## 🔗 URLs

### Reset Password Link Format
```
https://yourapp.com/?token=<64_char_hex_token>
```

### Edge Function Endpoint
```
https://YOUR_PROJECT.supabase.co/functions/v1/send-password-reset
```

---

## ✅ Testing Checklist

- [ ] Database migration executed successfully
- [ ] Edge function deployed
- [ ] Resend API key set
- [ ] User can request reset email
- [ ] Email arrives (check spam)
- [ ] Reset link opens ResetPasswordPage
- [ ] Password can be changed
- [ ] Old password no longer works
- [ ] New password works for login
- [ ] Token expires after 1 hour
- [ ] Used token cannot be reused

---

## 📊 Monitoring

### Check Email Delivery
- Resend Dashboard: [resend.com/emails](https://resend.com/emails)
- Edge Function Logs: Supabase Dashboard → Edge Functions

### Check Token Usage
```sql
-- Active tokens
SELECT COUNT(*) FROM users 
WHERE recovery_token IS NOT NULL 
AND recovery_token_expires_at > NOW();

-- Recent password resets (last 24h)
SELECT email, updated_at FROM users 
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

---

## 🆘 Support

**Common Questions:**

**Q: Can users reset password multiple times?**  
A: Yes, each request generates a new token (old token becomes invalid)

**Q: What happens if token expires?**  
A: User sees error message and must request new reset link

**Q: Do I need to disable Supabase auth reset?**  
A: No, both systems can coexist (custom system takes priority)

**Q: Is the edge function authenticated?**  
A: Yes, requires valid Supabase anon key in request header

---

## 🎯 Next Steps

After deployment:

1. Test the flow end-to-end
2. Monitor Resend dashboard for email delivery
3. Check edge function logs for any errors
4. Inform users about new password reset feature
5. Monitor database for expired tokens (cleanup optional)

---

**Version:** 1.0.0  
**Last Updated:** February 10, 2026  
**Status:** Production Ready ✅

For detailed information, see [CUSTOM_PASSWORD_RESET_GUIDE.md](./CUSTOM_PASSWORD_RESET_GUIDE.md)

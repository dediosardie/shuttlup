# Email Notification Setup Guide

## Overview
The system now sends email notifications to passengers when they are added to a trip. This uses Supabase Edge Functions and the Resend email service.

## Setup Steps

### 1. Sign up for Resend (Free Tier)
1. Go to [https://resend.com](https://resend.com)
2. Create a free account
3. Free tier includes 100 emails/day and 3,000 emails/month

### 2. Get Your Resend API Key
1. Log in to Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Copy the API key (starts with `re_`)

### 3. Verify Your Domain (Optional but Recommended)
For production use, verify your sending domain:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `yourdomain.com`)
4. Add the required DNS records (SPF, DKIM, etc.)
5. Wait for verification

**For testing:** You can use `onboarding@resend.dev` as the sender (limited to your own email)

### 4. Deploy the Edge Function

#### Option A: Using Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Deploy the function
supabase functions deploy send-trip-notification
```

#### Option B: Using Supabase Dashboard
1. Log in to [https://supabase.com](https://supabase.com)
2. Go to your project
3. Navigate to **Edge Functions** in the sidebar
4. Click **Create a new function**
5. Name it: `send-trip-notification`
6. Copy the contents of `supabase/functions/send-trip-notification/index.ts`
7. Paste into the editor
8. Click **Deploy**
9. Go to **Settings** → **Secrets**
10. Add secret: `RESEND_API_KEY` with your Resend API key

### 5. Update the Email Sender Address
In `supabase/functions/send-trip-notification/index.ts`, line 112:
```typescript
from: 'Shuttle Management <noreply@yourdomain.com>', // Update with your domain
```

**Options:**
- **Testing:** Use `onboarding@resend.dev` (only sends to your verified email)
- **Production:** Use your verified domain (e.g., `noreply@yourdomain.com`)

### 6. Test the Email Function

You can test the function directly from Supabase Dashboard:
1. Go to **Edge Functions**
2. Select `send-trip-notification`
3. Click **Invoke Function**
4. Use this test payload:
```json
{
  "to": "your-email@example.com",
  "passengerName": "Test User",
  "tripDetails": {
    "shuttleNo": "TEST-001",
    "requestor": "Admin User",
    "dateOfService": "2/8/2026",
    "arrivalTime": "10:00 AM",
    "route": "Route A",
    "address": "123 Test Street",
    "reason": "Test Trip",
    "vanDriver": "John Driver",
    "vanNumber": "VAN-01"
  }
}
```

### 7. Verify Email Sending

When a user adds passengers to a trip:
1. The system calls the edge function automatically
2. Passengers receive an email with trip details
3. Email includes all trip information in a formatted layout
4. Check Supabase Edge Function logs for any errors

## Email Content

The email includes:
- **Trip Assignment Notification** header
- Passenger's name
- Complete trip details:
  - Shuttle Number
  - Requestor
  - Date of Service
  - Arrival Time
  - Route
  - Address
  - Van Driver
  - Van Number
  - Purpose/Reason
- Call to action to confirm attendance

## Troubleshooting

### Emails Not Sending
1. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → Edge Functions → send-trip-notification
   - View logs to see errors

2. **Verify API Key:**
   - Ensure `RESEND_API_KEY` secret is set correctly
   - Test the API key in Resend dashboard

3. **Check Email Limits:**
   - Free tier: 100 emails/day, 3,000/month
   - Upgrade if you exceed limits

4. **Domain Verification:**
   - If using custom domain, ensure DNS records are verified
   - Check Resend dashboard for verification status

### Common Errors

**"Email service not configured"**
- Solution: Set the `RESEND_API_KEY` secret in Supabase

**"Failed to send email"**
- Check Resend API key is valid
- Verify domain if using custom sender
- Check Resend dashboard for detailed error logs

**Function timeout**
- Edge functions have 30-second timeout
- Check network connectivity
- Verify Resend API is accessible

## Cost Considerations

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month
- $0/month

**Resend Pro Plan (if needed):**
- 50,000 emails/month
- $20/month
- Additional emails: $1 per 1,000

**Supabase Edge Functions:**
- Included in free tier
- 500,000 invocations/month
- 2 GB outbound data transfer

## Security Notes

1. **API Key Protection:**
   - Never commit API keys to git
   - Always use Supabase secrets
   - API key is only accessible in Edge Function environment

2. **Email Validation:**
   - System validates all email addresses
   - Invalid emails are logged but don't block trip creation

3. **Rate Limiting:**
   - Resend has built-in rate limiting
   - Edge function handles errors gracefully

## Testing Checklist

- [ ] Resend account created
- [ ] API key obtained and set as Supabase secret
- [ ] Edge function deployed
- [ ] Sender email configured
- [ ] Test email received successfully
- [ ] Production domain verified (optional)
- [ ] Email formatting looks correct
- [ ] All trip details display properly

## Support

For issues:
- **Resend:** [https://resend.com/docs](https://resend.com/docs)
- **Supabase Edge Functions:** [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

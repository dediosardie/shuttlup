# Email Notification Troubleshooting Guide

## Error: "Edge Function returned a non-2xx status code"

This error means the Supabase Edge Function is either not deployed or encountering an error. Follow these steps to diagnose and fix:

## Step 1: Check if Edge Function Exists

### Using Supabase Dashboard:
1. Log in to [https://supabase.com](https://supabase.com)
2. Go to your project
3. Click **Edge Functions** in the sidebar
4. Look for `send-trip-notification` in the list

**If you don't see it:** The function hasn't been deployed yet. Skip to Step 5.

**If you see it:** Continue to Step 2.

## Step 2: Check Edge Function Logs

1. In Supabase Dashboard → **Edge Functions**
2. Click on `send-trip-notification`
3. Go to the **Logs** tab
4. Look for recent invocations and any error messages

### Common Error Messages:

**"RESEND_API_KEY is not configured"**
- Solution: Go to Step 3 to set the API key

**"Failed to send email"**
- Solution: Check Resend API key validity
- Verify domain configuration in Resend

**"Missing required fields"**
- Solution: Check the email payload format
- Verify TripRequestPage is sending correct data

## Step 3: Set RESEND_API_KEY Secret

### Using Supabase Dashboard:
1. Go to your project → **Settings** → **Edge Functions**
2. Scroll down to **Secrets**
3. Click **Add Secret**
4. Name: `RESEND_API_KEY`
5. Value: Your Resend API key (starts with `re_`)
6. Click **Save**

### Using Supabase CLI:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 4: Verify Resend API Key

1. Go to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Verify your API key is active
3. Check if you have any rate limits or quota issues
4. Test the API key with curl:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'
```

## Step 5: Deploy the Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-trip-notification

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** → **Create Function**
2. Name: `send-trip-notification`
3. Copy contents from `supabase/functions/send-trip-notification/index.ts`
4. Paste into the editor
5. Click **Deploy**

## Step 6: Test the Edge Function

### Test via Supabase Dashboard:
1. Go to **Edge Functions** → `send-trip-notification`
2. Click **Invoke Function**
3. Use this test payload:

```json
{
  "to": "your-email@example.com",
  "passengerName": "Test User",
  "tripDetails": {
    "shuttleNo": "TEST-001",
    "requestor": "Admin",
    "dateOfService": "2/8/2026",
    "arrivalTime": "10:00 AM",
    "route": "Test Route",
    "address": "123 Test St",
    "reason": "Testing",
    "vanDriver": "Test Driver",
    "vanNumber": "VAN-01"
  }
}
```

4. Check the response
5. Verify email received

### Test from Application:
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Create a new trip and add passengers
4. Watch for console logs:
   - "Sending email notification to..."
   - "Email sent successfully" or error messages
5. Check the logged error details

## Step 7: Common Fixes

### Issue: Function returns 404
**Solution:** Function not deployed. Complete Step 5.

### Issue: Function returns 500
**Possible causes:**
1. Missing RESEND_API_KEY → Complete Step 3
2. Invalid API key → Complete Step 4
3. Syntax error in function code → Check Edge Function logs

### Issue: Function returns 400
**Possible causes:**
1. Invalid email format in request
2. Missing required fields
3. Check console logs for payload being sent

### Issue: Email not received
**Checklist:**
- [ ] Check spam/junk folder
- [ ] Verify email address is correct
- [ ] Check Resend dashboard for delivery status
- [ ] Verify sender domain is not using free provider domain
- [ ] Check daily/monthly sending limits

## Step 8: Verify Email Sender Configuration

In `supabase/functions/send-trip-notification/index.ts`, check line 112:

```typescript
from: 'Shuttle Management <noreply@yourdomain.com>',
```

**For Testing:**
- Use `onboarding@resend.dev` (only sends to your verified email)

**For Production:**
- Use your verified domain (e.g., `noreply@yourdomain.com`)
- Domain must be verified in Resend dashboard

## Step 9: Check CORS Configuration

The edge function should have CORS headers. Verify in the code:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Step 10: Enable Detailed Logging

### Temporarily add more logging to TripRequestPage.tsx:

The code now includes detailed console logging:
- Email recipient and trip number
- Full error details with JSON stringification
- Error messages and stack traces

### Check Browser Console:
1. Press F12 to open Developer Tools
2. Go to **Console** tab
3. Try adding a passenger to a trip
4. Look for logged information:
   ```
   Sending email notification to user@example.com for trip TEST-001
   Edge Function error: {...}
   Error details: {...}
   ```

## Quick Checklist

Before opening a support ticket, verify:

- [ ] Edge function deployed in Supabase
- [ ] RESEND_API_KEY secret is set
- [ ] Resend API key is valid and active
- [ ] Sender email domain is configured correctly
- [ ] Test invocation from Supabase dashboard works
- [ ] Browser console shows detailed error logs
- [ ] Edge function logs show the invocation
- [ ] Not exceeding Resend free tier limits (100/day)

## Still Having Issues?

### Disable Email Notifications Temporarily:

If you need to use the app while troubleshooting emails, you can temporarily comment out the email sending:

In `TripRequestPage.tsx`, find these lines and comment them:

```typescript
// for (const passenger of selectedPassengers) {
//   await sendTripNotificationEmail(passenger, currentTrip);
// }
```

### Get More Help:

1. **Supabase Discord:** [https://discord.supabase.com](https://discord.supabase.com)
2. **Resend Support:** [support@resend.com](mailto:support@resend.com)
3. **Check Edge Function Logs:** Most errors will show detailed information here

## Debug Mode

To see exactly what's being sent to the edge function, add this before the invoke call:

```typescript
console.log('Invoking edge function with payload:', {
  to: passenger.email,
  passengerName: passenger.full_name,
  tripDetails: { ... }
});
```

This will help identify if the issue is with:
- The data being sent
- The edge function itself
- The email service (Resend)

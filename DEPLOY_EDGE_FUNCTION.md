# Deploy Edge Function - Quick Fix for 401 Error

## The Problem
You're getting: `401 (Unauthorized)` when calling the edge function.

## The Solution

You need to **redeploy the updated edge function** with the authentication fix.

## Steps to Fix:

### Option 1: Using Supabase CLI (Fastest)

```bash
# 1. Make sure you have Supabase CLI installed
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref btsdfmfifqahijazssmy

# 4. Deploy the updated function
supabase functions deploy send-trip-notification

# 5. Set the Resend API key (if not already set)
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Option 2: Using Supabase Dashboard

1. Go to [https://supabase.com/dashboard/project/btsdfmfifqahijazssmy](https://supabase.com/dashboard/project/btsdfmfifqahijazssmy)

2. Navigate to **Edge Functions** in the sidebar

3. Find `send-trip-notification` and click on it

4. Click **Edit Function** or **Delete** and recreate

5. Copy the **entire contents** from `d:\Projects\shuttlup\supabase\functions\send-trip-notification\index.ts`

6. Paste into the editor

7. Click **Deploy**

8. Go to **Settings** → **Edge Functions** → **Secrets**

9. Verify `RESEND_API_KEY` is set (add it if missing)

## What Changed?

The updated edge function now:
- ✅ Properly handles authorization headers
- ✅ Logs when no auth header is provided (won't fail)
- ✅ Includes proper CORS headers
- ✅ Has better error logging

The client-side code now:
- ✅ Includes the user's session token in the request
- ✅ Has detailed error logging

## Verify the Fix

After redeploying:

1. **Test from Supabase Dashboard:**
   - Go to Edge Functions → send-trip-notification
   - Click **Invoke Function**
   - Use this payload:
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
   - Should return success (not 401)

2. **Test from your app:**
   - Open browser console (F12)
   - Create a trip and add a passenger
   - Check console logs for:
     - "Sending email notification to..."
     - "Email sent successfully" (no more 401 errors)

## Still Getting 401?

If you still get 401 after redeploying, check:

1. **Edge Function is actually updated:**
   - Click on the function in Supabase dashboard
   - Check the code includes the new authentication handling

2. **Clear browser cache:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

3. **Check Edge Function logs:**
   - Supabase Dashboard → Edge Functions → send-trip-notification → Logs
   - Look for "Warning: No authorization header provided"

4. **Verify you're logged in:**
   - The app needs an active user session
   - Try logging out and back in

## Quick Commands Reference

```bash
# Deploy function
supabase functions deploy send-trip-notification

# View logs
supabase functions logs send-trip-notification

# Test locally
supabase functions serve send-trip-notification

# List all secrets
supabase secrets list

# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_key
```

## Need to Skip Email Temporarily?

If you need the app working immediately while fixing emails, comment out these lines in `TripRequestPage.tsx`:

```typescript
// Temporarily disable emails
// for (const passenger of selectedPassengers) {
//   await sendTripNotificationEmail(passenger, currentTrip);
// }
```

Then uncomment after the edge function is fixed.

# Deploy Password Reset Edge Function

## Quick Fix for "FunctionsFetchError"

The error occurs because the edge function is not deployed to Supabase.

---

## Prerequisites

1. ✅ Supabase CLI installed
2. ✅ Resend account with API key ([resend.com](https://resend.com))
3. ✅ Supabase project linked

---

## Deployment Steps

### 1. Check if Supabase CLI is installed

```bash
supabase --version
```

If not installed:
```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link your project (if not already linked)

```bash
supabase link --project-ref your-project-ref
```

To find your project ref:
- Go to Supabase Dashboard → Project Settings → General
- Copy "Reference ID"

### 4. Deploy the edge function

```bash
supabase functions deploy send-password-reset
```

### 5. Set Resend API Key

```bash
supabase secrets set RESEND_API_KEY=re_your_resend_api_key_here
```

To get Resend API key:
1. Go to [resend.com](https://resend.com)
2. Sign up (free tier available)
3. Go to API Keys → Create API Key

### 6. Verify deployment

```bash
supabase secrets list
```

Should show: `RESEND_API_KEY`

---

## Test the Function

```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/send-password-reset' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"email":"test@example.com","appUrl":"http://localhost:5173"}'
```

---

## Troubleshooting

### Error: "Project not linked"
```bash
supabase link --project-ref your-project-ref
```

### Error: "Function not found"
```bash
# Verify function exists
ls supabase/functions/send-password-reset/

# Deploy again
supabase functions deploy send-password-reset
```

### Error: "RESEND_API_KEY not set"
```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
```

---

## After Deployment

✅ Password reset should work:
1. Click "Forgot Password"
2. Enter email
3. Check email for reset link
4. Click link
5. Reset password

---

## Check Logs

```bash
supabase functions logs send-password-reset
```

Or view in Supabase Dashboard:
- Edge Functions → send-password-reset → Logs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PasswordResetRequest {
  email: string
  appUrl: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    console.log('🔐 Password reset edge function invoked:', new Date().toISOString())
    
    // Parse request body
    const { email, appUrl }: PasswordResetRequest = await req.json()

    // Validate inputs
    if (!email || !appUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (email, appUrl)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Call database function to generate recovery token
    console.log('📧 Requesting password reset for:', email)
    const { data, error: dbError } = await supabase
      .rpc('request_password_reset', { user_email: email })

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check result
    const result = data?.[0]
    console.log('📋 Reset request result:', result)

    if (!result?.success) {
      // User not found or inactive - return specific error
      console.log('⚠️ User not found or inactive')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result?.message || 'Email address not found. Please check your email or register for an account.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no token returned, user doesn't exist
    if (!result.token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email address not found. Please check your email or register for an account.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build reset URL
    const resetUrl = `${appUrl}/reset-password?token=${result.token}`
    console.log('🔗 Reset URL generated (token length):', result.token.length)

    // Create email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
        }
        p {
            color: #4b5563;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .button-container {
            text-align: center;
        }
        .info-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .security-notice {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            font-size: 13px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚐 Shutt'L Up</div>
        </div>

        <h1>Reset Your Password</h1>

        <p>Hello ${result.full_name || 'there'},</p>

        <p>We received a request to reset the password for your Shutt'L Up account. If you made this request, click the button below to reset your password:</p>

        <div class="button-container">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>

        <div class="info-box">
            <p><strong>⏱️ This link will expire in 1 hour</strong></p>
        </div>

        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px; font-size: 12px;">
            ${resetUrl}
        </p>

        <div class="security-notice">
            <p><strong>🔒 Security Notice:</strong></p>
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p style="margin-top: 10px;">For security reasons, this link will expire in 1 hour. If you need to reset your password after that, please request a new reset link.</p>
        </div>

        <div class="footer">
            <p>This is an automated message from Shutt'L Up.</p>
            <p>If you have questions, please contact your administrator.</p>
        </div>
    </div>
</body>
</html>
    `

    // Send email via Resend
    console.log('📤 Sending email via Resend...')
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Shutt\'L Up <noreply@shuttlup.com>',
        to: [email],
        subject: 'Reset Your Password - Shutt\'L Up',
        html: emailHtml,
      }),
    })

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', emailData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: emailData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Password reset email sent successfully:', emailData.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset email sent successfully',
        emailId: emailData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

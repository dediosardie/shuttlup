import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface TripDetails {
  shuttleNo: string
  requestor: string
  dateOfService: string
  arrivalTime: string
  route: string
  address: string
  reason: string
  vanDriver: string
  vanNumber: string
}

interface EmailRequest {
  to: string
  passengerName: string
  tripDetails: TripDetails
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request for debugging
    console.log('Edge function invoked:', new Date().toISOString())
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    // Parse request body
    const { to, passengerName, tripDetails }: EmailRequest = await req.json()

    // Validate inputs
    if (!to || !passengerName || !tripDetails) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .trip-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; color: #667eea; min-width: 150px; }
            .info-value { color: #4b5563; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚐 Trip Assignment Notification</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${passengerName}</strong>,</p>
              <p>You have been added as a passenger to a shuttle trip. Please review the details below:</p>
              
              <div class="trip-info">
                <h2 style="color: #667eea; margin-top: 0;">Trip Details</h2>
                
                <div class="info-row">
                  <div class="info-label">Shuttle Number:</div>
                  <div class="info-value">${tripDetails.shuttleNo}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Requested By:</div>
                  <div class="info-value">${tripDetails.requestor}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Date of Service:</div>
                  <div class="info-value">${tripDetails.dateOfService}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Arrival Time:</div>
                  <div class="info-value">${tripDetails.arrivalTime}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Route:</div>
                  <div class="info-value">${tripDetails.route}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Address:</div>
                  <div class="info-value">${tripDetails.address}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Van Driver:</div>
                  <div class="info-value">${tripDetails.vanDriver}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Van Number:</div>
                  <div class="info-value">${tripDetails.vanNumber}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Purpose:</div>
                  <div class="info-value">${tripDetails.reason}</div>
                </div>
              </div>
              
              <p><strong>Action Required:</strong> Please confirm your attendance by logging into the shuttle management system.</p>
              
              <p style="color: #6b7280; font-size: 14px;">If you have any questions or concerns, please contact the trip requestor or the shuttle coordinator.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Shuttle Management System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Shuttle Management <noreply@yourdomain.com>', // Update with your domain
        to: [to],
        subject: `Trip Assignment: Shuttle #${tripDetails.shuttleNo}`,
        html: emailHtml,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const error = await res.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in send-trip-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

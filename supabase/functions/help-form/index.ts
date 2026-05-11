import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, email, message, source } = await req.json()

    if (!email || !message) {
      return new Response(JSON.stringify({ error: 'Email and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL')!

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Landed <onboarding@resend.dev>',
        to: NOTIFY_EMAIL,
        reply_to: email,
        subject: `💬 Help request — Landed ${source === 'app' ? 'app' : 'landing page'}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a3d2b;margin-bottom:4px;">New help request</h2>
            <p style="color:#6b8070;margin-bottom:20px;font-size:14px;">Via ${source === 'app' ? 'the app' : 'the landing page'} · Reply directly to this email to respond</p>
            <div style="background:#f7f3ed;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <div style="margin-bottom:12px;">
                <span style="font-size:12px;color:#9aafa0;text-transform:uppercase;letter-spacing:0.06em;">From</span>
                <div style="font-size:15px;color:#1a3d2b;margin-top:2px;">${name || 'Anonymous'} &lt;${email}&gt;</div>
              </div>
              <div>
                <span style="font-size:12px;color:#9aafa0;text-transform:uppercase;letter-spacing:0.06em;">Message</span>
                <div style="font-size:14px;color:#3a5a44;margin-top:6px;line-height:1.7;">${message.replace(/\n/g, '<br>')}</div>
              </div>
            </div>
            <p style="font-size:12px;color:#9aafa0;">Hit reply to respond directly to ${email}</p>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

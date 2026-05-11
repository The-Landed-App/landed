import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, origin, months, story_text } = await req.json()

    // Insert into stories table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const speed = months < 12 ? 'fast' : months <= 24 ? 'typical' : 'long'

    const { error: insertError } = await supabase
      .from('stories')
      .insert({ name: name || null, origin, months: parseInt(months), story_text, speed, status: 'pending' })

    if (insertError) throw insertError

    // Send email notification via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL')!

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Landed <notifications@thelandedapp.com>',
        to: NOTIFY_EMAIL,
        subject: '📖 New story submitted on Landed',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a3d2b;margin-bottom:4px;">New story submitted</h2>
            <p style="color:#6b8070;margin-bottom:20px;font-size:14px;">Review and approve in your Supabase dashboard</p>
            <div style="background:#f7f3ed;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <div style="margin-bottom:10px;">
                <span style="font-size:12px;color:#9aafa0;text-transform:uppercase;letter-spacing:0.06em;">Name</span>
                <div style="font-size:15px;color:#1a3d2b;margin-top:2px;">${name || 'Anonymous'}</div>
              </div>
              <div style="margin-bottom:10px;">
                <span style="font-size:12px;color:#9aafa0;text-transform:uppercase;letter-spacing:0.06em;">Origin & time</span>
                <div style="font-size:15px;color:#1a3d2b;margin-top:2px;">${origin || '—'} · ${months} months</div>
              </div>
              <div>
                <span style="font-size:12px;color:#9aafa0;text-transform:uppercase;letter-spacing:0.06em;">Story</span>
                <div style="font-size:14px;color:#3a5a44;margin-top:6px;line-height:1.6;font-style:italic;">"${story_text}"</div>
              </div>
            </div>
            <a href="https://supabase.com/dashboard/project/nbfkmxgtlfzbanfleuss/editor" 
               style="display:inline-block;background:#1a3d2b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:500;">
              Review in Supabase →
            </a>
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

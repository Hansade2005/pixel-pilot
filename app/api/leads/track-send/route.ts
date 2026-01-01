import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const trackSendSchema = z.object({
  leadEmail: z.string().email(),
  leadName: z.string(),
  segment: z.enum(['investor', 'creator', 'partner', 'user', 'other']),
  company: z.string().optional(),
  context: z.string().optional(),
  source: z.string().optional(),
  subject: z.string(),
  content: z.string(),
  html: z.string()
})

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const data = trackSendSchema.parse(body)

    console.log('📧 Tracking email send to:', data.leadEmail)

    // Check if lead exists
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads_email_tracking')
      .select('*')
      .eq('lead_email', data.leadEmail)
      .single()

    const messageData = {
      subject: data.subject,
      content: data.content,
      html: data.html,
      sent_at: new Date().toISOString()
    }

    if (existingLead) {
      // Update existing lead
      const messages = existingLead.messages || []
      messages.push(messageData)

      const { error: updateError } = await supabase
        .from('leads_email_tracking')
        .update({
          times_sent: existingLead.times_sent + 1,
          last_sent_at: new Date().toISOString(),
          messages: messages
        })
        .eq('lead_email', data.leadEmail)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      console.log('✅ Updated existing lead tracking')
    } else {
      // Insert new lead
      const { error: insertError } = await supabase
        .from('leads_email_tracking')
        .insert({
          lead_email: data.leadEmail,
          lead_name: data.leadName,
          segment: data.segment,
          company: data.company,
          context: data.context,
          source: data.source,
          times_sent: 1,
          last_sent_at: new Date().toISOString(),
          messages: [messageData]
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      console.log('✅ Created new lead tracking')
    }

    return Response.json({
      success: true,
      message: 'Email send tracked successfully'
    })

  } catch (error) {
    console.error('❌ Error tracking email send:', error)
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to track email send' },
      { status: 500 }
    )
  }
}

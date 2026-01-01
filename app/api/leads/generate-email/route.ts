import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const generateEmailSchema = z.object({
  leadName: z.string().min(1),
  leadEmail: z.string().email(),
  segment: z.enum(['investor', 'creator', 'partner', 'user', 'other']),
  company: z.string().optional(),
  context: z.string().optional(),
  source: z.string().optional(),
  regenerate: z.boolean().optional(),
  improveType: z.enum(['grammar', 'tone', 'length', 'clarity', 'engagement']).optional(),
  currentContent: z.string().optional(),
})

// Segment-specific AI prompts
const getSegmentPrompt = (segment: string, lead: any) => {
  const firstName = lead.leadName.split(' ')[0]
  
  const prompts: Record<string, string> = {
    investor: `Generate a professional cold email to an investor for PiPilot - AI-Powered App Builder.

Investor Details:
- Name: ${lead.leadName}
- Firm/Company: ${lead.company || 'N/A'}
- Context: ${lead.context || 'Investor in AI/tech startups'}
- Source: ${lead.source || 'Research'}

About PiPilot:
PiPilot is an AI-powered app builder that lets anyone create full-stack web applications through natural conversation. Key features:
- AI-first development platform (no coding required)
- Visual editor with live preview
- Instant deployment
- Template marketplace for monetization
- Active community of 1700+ qualified leads

Key Investment Points:
- Market opportunity: $13.2B no-code market growing at 23% CAGR
- Traction: 1700+ qualified leads, active user base
- Revenue model: SaaS subscriptions + 30% marketplace commission
- Competitive advantage: AI-powered "vibe coding" with visual editing

Tone: Professional, data-driven, concise but compelling
Length: 120-150 words
Personalization: Reference their portfolio/interests from context if available

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Brief subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Make it personal, avoid buzzwords, and include a clear call-to-action (15-min intro call or demo).`,

    creator: `Generate an inspiring cold email to a creator/educator for PiPilot - AI-Powered App Builder.

Creator Details:
- Name: ${lead.leadName}
- Background: ${lead.context || 'Content creator/educator'}
- Platform: ${lead.source || 'Social media'}

About PiPilot:
PiPilot is an AI-powered app builder that turns ideas into working applications in minutes. Perfect for creators:
- Build apps by describing what you want in plain English
- No coding knowledge needed
- Monetize on template marketplace (earn 70% from sales)
- Share your creations with community
- Free tier + exclusive early access available

Key Creator Benefits:
- Turn content ideas into interactive apps
- Create tools for your audience
- Passive income through template sales
- Educational content opportunities
- Join community of fellow creators

Tone: Friendly, inspiring, conversational but professional
Length: 100-130 words
Personalization: Reference their work/content from context if available

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Creative subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Make it personal, enthusiastic, and include a clear call-to-action (try free trial or join waitlist).`,

    partner: `Generate a partnership proposal email for PiPilot - AI-Powered App Builder.

Company/Contact Details:
- Name: ${lead.leadName}
- Company: ${lead.company || 'N/A'}
- Context: ${lead.context || 'Potential partner'}

About PiPilot:
PiPilot is an AI-powered app development platform with partnership opportunities:
- Integration partnerships (embed PiPilot in your platform)
- Reseller/affiliate programs (generous commission structure)
- Co-marketing opportunities (cross-promotion to engaged audiences)
- API partnerships (white-label solutions)

Partnership Benefits:
- Revenue share: Up to 30% recurring commission
- Technical support: Full API access and documentation
- Marketing support: Co-branded campaigns and content
- Product integration: Seamless embedding options

Tone: Professional, mutually beneficial, strategic
Length: 130-160 words
Personalization: Suggest specific integration/partnership based on their platform

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Partnership-focused subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Focus on mutual value, be specific about integration opportunities, and include clear next step (partnership call).`,

    user: `Generate an engaging cold email to a potential user for PiPilot - AI-Powered App Builder.

User Details:
- Name: ${lead.leadName}
- Background: ${lead.context || 'Tech enthusiast'}
- Interest: ${lead.source || 'AI/development tools'}

About PiPilot:
PiPilot is an AI-powered app builder that makes development accessible to everyone:
- Build full-stack apps with AI assistance
- Live preview as you build
- Supports React, Next.js, Node.js, databases, and more
- Instant deployment to production
- Free trial with credits to get started
- Active community of builders

Key Features:
- Natural language → Working code
- Visual editor for fine-tuning
- Template library for quick starts
- AI code generation and debugging
- Collaboration tools

Tone: Enthusiastic, helpful, technical but approachable
Length: 110-140 words
Personalization: Reference their interests/projects from context

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Benefit-driven subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Highlight ease of use, share impressive capabilities, and include clear call-to-action (start free trial).`,

    other: `Generate a professional introductory email for PiPilot - AI-Powered App Builder.

Contact Details:
- Name: ${lead.leadName}
- Context: ${lead.context || 'Potential contact'}

About PiPilot:
PiPilot is an AI-powered platform that lets anyone build professional web applications through natural conversation. No coding required.

Key Benefits:
- Turn ideas into working apps in minutes
- AI-powered development assistance
- Visual editor with live preview
- Instant deployment
- Growing community and template marketplace

Tone: Professional, friendly, informative
Length: 100-120 words

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Clear subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Keep it concise and include a clear call-to-action.`
  }
  
  return prompts[segment] || prompts.other
}

// HTML email template generator
const generateEmailHTML = (segment: string, content: string, leadName: string) => {
  const firstName = leadName.split(' ')[0]
  
  // Color schemes per segment
  const colors: Record<string, { primary: string; secondary: string; accent: string }> = {
    investor: { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#60a5fa' },
    creator: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#c4b5fd' },
    partner: { primary: '#059669', secondary: '#10b981', accent: '#34d399' },
    user: { primary: '#dc2626', secondary: '#ef4444', accent: '#f87171' },
    other: { primary: '#4b5563', secondary: '#6b7280', accent: '#9ca3af' }
  }
  
  const color = colors[segment] || colors.other
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PiPilot - AI-Powered App Builder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${color.primary} 0%, ${color.secondary} 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                ✨ PiPilot
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 400;">
                AI-Powered App Builder
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 500;">
                Hi ${firstName},
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px 40px; color: #374151; font-size: 16px; line-height: 1.7;">
              ${content.split('\n\n').map(para => `<p style="margin: 0 0 16px 0;">${para.trim()}</p>`).join('')}
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="https://pipilot.dev?utm_source=cold_email&utm_medium=email&utm_campaign=${segment}" 
                 style="display: inline-block; background: linear-gradient(135deg, ${color.primary} 0%, ${color.secondary} 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
                Get Started with PiPilot →
              </a>
            </td>
          </tr>
          
          <!-- Signature -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">
                Best regards,
              </p>
              <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
                Hans Ade
              </p>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                Founder, PiPilot
              </p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                <a href="mailto:hello@pipilot.dev" style="color: ${color.secondary}; text-decoration: none;">hello@pipilot.dev</a>
              </p>
            </td>
          </tr>
          
          <!-- Features Section -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600; text-align: center;">
                Why PiPilot?
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 0 10px 0 0; vertical-align: top;">
                    <p style="margin: 0 0 12px 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">🤖</span>
                      <strong style="color: #111827;">AI-Powered</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Build with natural language</span>
                    </p>
                  </td>
                  <td width="50%" style="padding: 0 0 0 10px; vertical-align: top;">
                    <p style="margin: 0 0 12px 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">⚡</span>
                      <strong style="color: #111827;">Instant Deploy</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Production-ready in minutes</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 12px 10px 0 0; vertical-align: top;">
                    <p style="margin: 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">🎨</span>
                      <strong style="color: #111827;">Visual Editor</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Edit with live preview</span>
                    </p>
                  </td>
                  <td width="50%" style="padding: 12px 0 0 10px; vertical-align: top;">
                    <p style="margin: 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">💰</span>
                      <strong style="color: #111827;">Marketplace</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Monetize your templates</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f3f4f6; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                PiPilot - Build Anything with AI
              </p>
              <p style="margin: 0 0 16px 0;">
                <a href="https://pipilot.dev" style="color: ${color.secondary}; text-decoration: none; margin: 0 12px; font-size: 14px;">Website</a>
                <a href="https://pipilot.dev/docs" style="color: ${color.secondary}; text-decoration: none; margin: 0 12px; font-size: 14px;">Docs</a>
                <a href="https://pipilot.dev/pricing" style="color: ${color.secondary}; text-decoration: none; margin: 0 12px; font-size: 14px;">Pricing</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 PiPilot. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                <a href="{{UNSUBSCRIBE_URL}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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
    const validatedData = generateEmailSchema.parse(body)

    console.log('🎯 Generating email for lead:', validatedData.leadEmail, '| Segment:', validatedData.segment)

    // Handle improvement or regeneration
    let prompt: string
    
    if (validatedData.improveType && validatedData.currentContent) {
      // Improve existing content
      prompt = `Improve this email ${validatedData.improveType}:

Original Email:
${validatedData.currentContent}

Make it better in terms of ${validatedData.improveType}. Keep the same general message but enhance it.

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Improved subject line under 60 characters",
  "content": "Improved email body in plain text format"
}`
    } else {
      // Generate new email
      prompt = getSegmentPrompt(validatedData.segment, validatedData)
    }

    const codestralModel = getModel('codestral-latest')
   
    // Generate email using AI
    const result = await generateText({
      model: codestralModel,
      temperature: 0.8, // Higher for more natural, human-like writing
      prompt: prompt,
    })

    // Parse the JSON response
    let emailData: { subject: string; content: string }
    
    try {
      // Extract JSON from potential markdown code blocks
      let jsonText = result.text.trim()
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim()
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim()
      }
      
      emailData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', result.text)
      throw new Error('AI response format invalid')
    }

    // Generate HTML version
    const htmlContent = generateEmailHTML(
      validatedData.segment,
      emailData.content,
      validatedData.leadName
    )

    console.log('✨ Email generated successfully')

    return Response.json({
      success: true,
      subject: emailData.subject,
      content: emailData.content,
      html: htmlContent,
      segment: validatedData.segment,
    })

  } catch (error) {
    console.error('❌ Error generating email:', error)
    
    // Return error response
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    )
  }
}

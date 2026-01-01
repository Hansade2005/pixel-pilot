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
    investor: `Generate a professional cold email to an investor for PiPilot - Canada's First Agentic Vibe Coding Platform.

Investor Details:
- Name: ${lead.leadName}
- Firm/Company: ${lead.company || 'N/A'}
- Context: ${lead.context || 'Investor in AI/tech startups'}
- Source: ${lead.source || 'Research'}

About PiPilot:
PiPilot (pipilot.dev) is Canada's pioneering Agentic Vibe Coding Platform - a revolutionary AI-powered development platform that transforms web application development through conversational AI and advanced visual editing.

Key Technology:
- PIXEL FORGE: Advanced AI architecture integrating Mistral Pixtral + Codestral models
- Conversational AI Development: Transform natural language into functional code
- Multi-Framework Support: Next.js (SSR/SSG), Vite+React (SPA), Expo (cross-platform mobile)
- Visual Editing Revolution: Click-to-edit interface with real-time styling and component manipulation
- PiPilot SWE Agent: Autonomous GitHub App for intelligent code generation via PR automation
- PiPilot MCP Server: Model Context Protocol HTTP server enabling AI assistants to access database operations

Integrations & Ecosystem:
- GitHub (repository management, PR automation, SWE Agent)
- Vercel & Netlify (one-click deployments with global CDN)
- Supabase (PostgreSQL database with real-time capabilities, auth, storage)
- Stripe (payment processing, subscriptions, marketplace payouts)
- PiPilot Database: Full database-as-a-service with REST API, SDK, and MCP integration
- 100+ Google Fonts, voice integration, theme switching

Market Position:
- Canada's first and leading alternative to Lovable.dev, Bolt.new, v0, Replit
- Superior AI-powered "vibe coding" with production-ready code generation
- Template marketplace with 70% creator revenue share
- Enterprise-grade security: encrypted token storage, OAuth 2.0, bank-level encryption

Key Investment Points:
- Market opportunity: $13.2B no-code/low-code market growing at 23% CAGR
- Strong traction: 1700+ qualified leads across investor, creator, partner, and user segments
- Revenue streams: SaaS subscriptions + 30% marketplace commission + enterprise licensing
- Competitive moat: PIXEL FORGE AI technology, multi-framework support, integrated ecosystem
- Canadian innovation: Leading North American AI development platform

Leadership:
- Hans Ade, Founder & CEO (hanscadx8@gmail.com, hello@pipilot.dev)
- Vision: Democratizing software development through agentic AI
- Contact: +237679719353 / +1 (416) 407-1923

Tone: Professional, data-driven, concise but compelling
Length: 120-150 words
Personalization: Reference their portfolio/interests from context if available

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Brief subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Make it personal, avoid buzzwords, include specific metrics, and clear call-to-action (15-min intro call or demo).`,

    creator: `Generate an inspiring cold email to a creator/educator for PiPilot - Canada's First Agentic Vibe Coding Platform.

Creator Details:
- Name: ${lead.leadName}
- Background: ${lead.context || 'Content creator/educator'}
- Platform: ${lead.source || 'Social media'}

About PiPilot:
PiPilot (pipilot.dev) is Canada's pioneering AI-powered development platform that turns ideas into working applications through natural conversation. Perfect for creators and educators:

Creator-Focused Features:
- Conversational AI: Build apps by describing what you want in plain English - no coding required
- Voice Integration: Speech-to-text with real-time voice commands for hands-free development
- Visual Editor: Click-to-edit interface with live preview - see changes instantly
- Multi-Framework: Create web apps (Next.js, Vite+React) or mobile apps (Expo) from one platform
- Template System: 100+ pre-built templates for blogs, portfolios, SaaS tools, e-commerce
- AI Enhancement: Intelligent prompt refinement and component suggestions
- 100+ Google Fonts + custom typography scaling for beautiful designs

Monetization Opportunities:
- Template Marketplace: Earn 70% revenue share from template sales (we take only 30%)
- Creator Dashboard: Real-time analytics, sales tracking, earnings reports
- Passive Income: Sell templates once, earn repeatedly as others purchase
- Educational Content: Create tutorials, courses, and learning materials using the platform
- Custom Integrations: Build tools for your audience with Stripe, Supabase, GitHub integrations

Platform Advantages:
- PIXEL FORGE AI: Advanced Mistral Pixtral + Codestral models for production-ready code
- Instant Deployment: Vercel/Netlify integration - deploy globally in one click
- Community: Join 1700+ creators, developers, and educators building together
- Database Included: PiPilot Database with full SDK, REST API, and MCP server support
- Enterprise Security: Bank-level encryption, OAuth 2.0, secure token storage

Support from Leadership:
- Hans Ade, Founder & CEO - personally committed to creator success
- Direct support: hello@pipilot.dev or hanscadx8@gmail.com
- Community-first approach with regular creator spotlights

Tone: Friendly, inspiring, conversational but professional
Length: 100-130 words
Personalization: Reference their work/content/audience from context if available

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Creative subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Make it personal, enthusiastic, highlight earning potential and creative freedom, include clear call-to-action (start creating or explore marketplace).`,

    partner: `Generate a partnership proposal email for PiPilot - Canada's First Agentic Vibe Coding Platform.

Company/Contact Details:
- Name: ${lead.leadName}
- Company: ${lead.company || 'N/A'}
- Context: ${lead.context || 'Potential partner'}

About PiPilot:
PiPilot (pipilot.dev) is Canada's pioneering AI-powered development platform with comprehensive API infrastructure and partnership ecosystem.

Technical Capabilities:
- PIXEL FORGE AI: Advanced Mistral Pixtral + Grok Code Fast 1 & Claude Sonnet 4.5 integration for enterprise-grade code generation
- Multi-Framework: Next.js (SSR/SSG), Vite+React (SPA), Expo (mobile) - single platform, multiple targets
- PiPilot Database: Full database-as-a-service with REST API, TypeScript SDK, and MCP HTTP server
- PiPilot MCP Server: Model Context Protocol integration for AI assistants (Claude, Cursor, VS Code, Windsurf)
- SWE Agent: GitHub App for autonomous code generation via PR automation
- Storage API: File upload/management with Supabase integration

Integration Options:
- **Platform Embedding**: White-label PiPilot editor in your product with custom branding
- **API Integration**: REST API + TypeScript SDK for database operations, file management, AI generation
- **GitHub Integration**: Repository management, PR automation, workflow triggers via SWE Agent
- **Deployment Pipeline**: Vercel/Netlify webhook integration for automated deployments
- **Database Connectivity**: Direct PostgreSQL access via Supabase with real-time subscriptions
- **Authentication System**: OAuth 2.0, JWT tokens, multi-provider auth (GitHub, Google, email)

Partnership Models:
1. **Technology Integration**: Embed PiPilot AI into your development tools
2. **Reseller/Affiliate**: 30% recurring commission on customer referrals
3. **Co-Marketing**: Joint webinars, content, case studies with shared audience reach (1700+ engaged users)
4. **White-Label**: Custom-branded AI development platform for your enterprise clients
5. **API Partnership**: Integrate PiPilot Database/Storage into your SaaS platform

Partnership Benefits:
- Revenue Share: Up to 30% recurring commission on all generated revenue
- Technical Support: Full API access, comprehensive docs, dedicated integration engineers
- Marketing Support: Co-branded campaigns, joint press releases, community promotion
- Product Integration: Seamless embedding with webhook callbacks and SSO
- Early Access: Beta features, roadmap input, priority support
- Success Team: Dedicated partnership manager for ongoing collaboration

Existing Ecosystem:
- GitHub (repository operations, SWE Agent automation)
- Vercel & Netlify (deployment pipelines)
- Supabase (database, auth, storage)
- Stripe (payment processing, marketplace)
- Pusher (real-time messaging)

Leadership:
- Hans Ade, Founder & CEO - Open to strategic partnerships
- Contact: hello@pipilot.dev, hanscadx8@gmail.com
- Phone: +237679719353 / +1 (416) 407-1923

Tone: Professional, mutually beneficial, strategic, technical
Length: 130-160 words
Personalization: Suggest specific integration based on their platform/technology stack

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Partnership-focused subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Focus on technical synergies, mutual value creation, specific integration opportunities, and clear next step (partnership discovery call).`,

    user: `Generate an engaging cold email to a potential user for PiPilot - Canada's First Agentic Vibe Coding Platform.

User Details:
- Name: ${lead.leadName}
- Background: ${lead.context || 'Tech enthusiast'}
- Interest: ${lead.source || 'AI/development tools'}

About PiPilot:
PiPilot (pipilot.dev) is Canada's pioneering Agentic Vibe Coding Platform - a revolutionary AI development platform that transforms ideas into production-ready applications through natural conversation.

Core Features:
- **Conversational AI Development**: Describe what you want in plain English - PIXEL FORGE AI (Mistral Pixtral + Grok Code Fast 1 & Claude Sonnet 4.5) generates production-ready code
- **Voice Integration**: Speech-to-text with noise-filtered audio input - code by talking
- **Multi-Framework Support**: Build Next.js (full-stack), Vite+React (SPA), or Expo (mobile) apps from one platform
- **Visual Editor Revolution**: Click any element to edit - real-time styling, component manipulation, live preview
- **Template System**: 100+ pre-built templates for SaaS, e-commerce, blogs, portfolios, dashboards
- **AI Code Generation**: Advanced code generation with context awareness, best practices, security integration

Development Experience:
- **Live Preview**: See changes instantly in browser with responsive testing
- **File Management**: VS Code-like file explorer with syntax highlighting
- **Advanced Typography**: 100+ Google Fonts with dynamic loading and accessibility compliance
- **Theme Switching**: One-click theme application with CSS variable support
- **Real-Time Collaboration**: Multiple users editing simultaneously with change synchronization
- **Git Integration**: Automatic version control with commit history

Integrations & Deployment:
- **GitHub**: Repository cloning, PR management, issue tracking, SWE Agent automation
- **Vercel/Netlify**: One-click deployment with global CDN, edge functions, preview URLs
- **Supabase**: PostgreSQL database, real-time subscriptions, auth, file storage
- **Stripe**: Payment processing, subscription management (for your apps)
- **PiPilot Database**: Full database-as-a-service with REST API, TypeScript SDK, MCP server

Advanced Capabilities:
- **PiPilot SWE Agent**: Autonomous GitHub App - mention @pipilot-swe-agent in issues to generate code via PRs
- **PiPilot MCP Server**: Connect AI assistants (Claude, Cursor, VS Code) to your database for natural language queries
- **API Key Management**: Secure external database access with usage tracking
- **Custom Hooks**: 10+ reusable React hooks for common patterns
- **UI Components**: 25+ shadcn/ui components for stunning interfaces

Security & Performance:
- Enterprise-grade security with encrypted token storage and OAuth 2.0
- Bank-level encryption for all data and communications
- Automatic code optimization, tree-shaking, lazy loading
- Performance monitoring with real-time metrics

Pricing & Access:
- Free trial with credits to explore all features
- Pay-as-you-go credit system (starts at $0.25 per message)
- Template marketplace access (buy/sell templates)
- Active community of 1700+ builders
- Comprehensive documentation and tutorials

Why PiPilot vs. Alternatives:
- Superior to Lovable.dev, Bolt.new, v0, Replit for Canadian market
- PIXEL FORGE AI generates production-ready code (not prototypes)
- Multi-framework support (not limited to one stack)
- Integrated database, storage, auth (not just frontend)
- Template monetization (earn while learning)

Leadership:
- Hans Ade, Founder & CEO - Built by developers for developers
- Contact: hello@pipilot.dev, hanscadx8@gmail.com

Tone: Enthusiastic, helpful, technical but approachable
Length: 110-140 words
Personalization: Reference their interests/projects/tech stack from context

Generate ONLY a JSON response with this exact structure:
{
  "subject": "Benefit-driven subject line under 60 characters",
  "content": "Email body in plain text format with proper paragraphs"
}

Highlight ease of use, impressive capabilities, specific features relevant to their background, and clear call-to-action (start free trial or explore templates).`,

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
                Founder & CEO, PiPilot
              </p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                <a href="mailto:hello@pipilot.dev" style="color: ${color.secondary}; text-decoration: none;">hello@pipilot.dev</a> • 
                <a href="mailto:hanscadx8@gmail.com" style="color: ${color.secondary}; text-decoration: none;">hanscadx8@gmail.com</a>
              </p>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                +1 (416) 407-1923 • +237 679 719 353
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
                      <strong style="color: #111827;">PIXEL FORGE AI</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Agentic vibe coding with Mistral</span>
                    </p>
                  </td>
                  <td width="50%" style="padding: 0 0 0 10px; vertical-align: top;">
                    <p style="margin: 0 0 12px 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">⚡</span>
                      <strong style="color: #111827;">Multi-Framework</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Next.js, React, Expo - one platform</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 12px 10px 0 0; vertical-align: top;">
                    <p style="margin: 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">🗄️</span>
                      <strong style="color: #111827;">PiPilot Database</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">Full DB + SDK + MCP server</span>
                    </p>
                  </td>
                  <td width="50%" style="padding: 12px 0 0 10px; vertical-align: top;">
                    <p style="margin: 0;">
                      <span style="color: ${color.primary}; font-size: 20px; margin-right: 8px;">🔗</span>
                      <strong style="color: #111827;">Full Integration</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">GitHub, Vercel, Supabase, Stripe</span>
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

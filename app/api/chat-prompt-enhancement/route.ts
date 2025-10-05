import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const enhanceChatPromptSchema = z.object({
  prompt: z.string().min(1).max(5000),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    createdAt: z.string().optional(),
  })).optional(),
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
    const { prompt, messages = [] } = enhanceChatPromptSchema.parse(body)

    console.log('✨ Enhancing chat prompt with context:', prompt)

    // Get the last 3 message pairs (user-assistant exchanges)
    const recentMessages = messages.slice(-6) // Last 6 messages to get up to 3 pairs

    // Build context from recent messages
    let contextString = ''
    if (recentMessages.length > 0) {
      contextString = '\n\nRecent conversation context:\n' +
        recentMessages.map((msg, index) => {
          const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'
          return `${role}: ${msg.content}`
        }).join('\n')
    }

    const codestralModel = getModel('codestral-latest')

    // Generate prompt suggestions using Codestral with conversation context and temperature for creativity
    const result = await generateText({
      model: codestralModel,
      temperature: 0.7, // Balanced creativity and professionalism
      prompt: `You are an expert AI prompt enhancer that creates detailed, actionable prompts for software development. You understand context from conversation history and enhance prompts to be more specific and implementable.

Here are examples of good prompt enhancements:

EXAMPLE 1:
Original: "add a login form"
Enhanced: "Create a modern login form component with email/password fields, remember me checkbox, forgot password link, and social login buttons (Google, GitHub). Use shadcn/ui components with proper validation using react-hook-form and zod. Include loading states, error handling, and responsive design."

EXAMPLE 2:
Original: "make a dashboard"
Enhanced: "Build a comprehensive dashboard with multiple chart types (bar, line, pie) using recharts, key metrics cards, recent activity feed, and data filters. Include dark mode support, responsive grid layout, and real-time data updates."

EXAMPLE 3:
Original: "add user profile"
Enhanced: "Implement a user profile page with avatar upload, personal information form (name, email, bio), password change functionality, and account settings. Use shadcn/ui components, include form validation, image cropping, and proper error handling."

User's current prompt: "${prompt}"${contextString}

Enhance this prompt by making it more detailed and actionable. Focus on:
- Specific technologies and frameworks to use
- UI/UX requirements and design considerations
- Data validation and error handling
- Performance and accessibility considerations
- Integration with existing codebase patterns

Create a professional, detailed prompt (60-120 words) that a developer could immediately start implementing. Avoid generic phrases like "based on current project state" - be direct and specific.

Return ONLY the enhanced prompt text, without any explanations, quotations, or markdown formatting.`,
    })
    const enhancedPrompt = result.text.trim()

    console.log('✨ Enhanced chat prompt:', enhancedPrompt)

    return Response.json({
      success: true,
      enhancedPrompt,
      originalPrompt: prompt,
    })

  } catch (error) {
    console.error('❌ Error enhancing chat prompt:', error)

    // Return error response
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to enhance chat prompt' },
      { status: 500 }
    )
  }
}
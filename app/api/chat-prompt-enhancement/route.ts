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

    // Generate prompt suggestions using Codestral with conversation context
    const result = await generateText({
      model: codestralModel,
      prompt: `You are an AI prompt enhancement expert working within an ongoing conversation. Your task is to enhance the user's current prompt by making it more specific, actionable, and contextually relevant based on the conversation history.

User's current prompt: "${prompt}"${contextString}

Based on the conversation context, enhance this prompt by:
1. Making it more specific to what the user and AI have been working on
2. Adding relevant technical details from the conversation
3. Incorporating any established patterns or requirements from previous exchanges
4. Making it more actionable given the current project state
5. Ensuring it builds upon what has already been accomplished

Keep the enhanced prompt concise (50-150 words) but significantly more detailed and contextually appropriate than the original.

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
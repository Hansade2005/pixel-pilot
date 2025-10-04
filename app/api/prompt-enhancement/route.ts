import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const enhancePromptSchema = z.object({
  prompt: z.string().min(1).max(5000),
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
    const { prompt } = enhancePromptSchema.parse(body)

    console.log('✨ Enhancing prompt using Pixtral:', prompt)

    // Get Pixtral model for prompt enhancement
    const pixtralModel = getModel('pixtral-large-latest')

    // Enhance the prompt using Pixtral
    const result = await generateText({
      model: pixtralModel,
      prompt: `You are an AI prompt enhancement expert. Your task is to take a user's basic prompt for building a web application and enhance it to be more detailed, specific, and actionable.

User's original prompt: "${prompt}"

Enhance this prompt by:
1. Adding specific technical details and requirements
2. Including modern design considerations
3. Mentioning key features that would make the app more complete
4. Adding UI/UX best practices
5. Making it more descriptive and actionable

Keep the enhanced prompt concise (50-150 words) but significantly more detailed than the original.

Return ONLY the enhanced prompt text, without any explanations, quotations, or markdown formatting.`,
    })

    const enhancedPrompt = result.text.trim()

    console.log('✨ Enhanced prompt:', enhancedPrompt)

    return Response.json({
      success: true,
      enhancedPrompt,
      originalPrompt: prompt,
    })

  } catch (error) {
    console.error('❌ Error enhancing prompt:', error)
    
    // Return error response
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to enhance prompt' },
      { status: 500 }
    )
  }
}

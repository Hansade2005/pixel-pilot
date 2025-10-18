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

   const codestralModel = getModel('codestral-latest')
   
       // Generate prompt suggestions using Codestral with temperature for creativity
       const result = await generateText({
         model: codestralModel,
         temperature: 0.7, // Balanced creativity and professionalism
      prompt: `You are an expert AI prompt enhancer that creates detailed, actionable prompts for web application development. You take basic user requests and transform them into comprehensive, implementable specifications. Do not include any framework or library details; focus only on UI/UX, functionality, interactions, and overall user experience.

Here are examples of good prompt enhancements:

EXAMPLE 1:
Original: "add a login form"
Enhanced: "Create a modern login form with email/password fields, remember me checkbox, forgot password link, and social login options. Include input validation, error handling, loading states, and responsive design."

EXAMPLE 2:
Original: "make a dashboard"
Enhanced: "Build a comprehensive dashboard with multiple chart types, key metrics cards, recent activity feed, and data filters. Include responsive grid layout, accessibility support, and real-time data updates."

EXAMPLE 3:
Original: "add user profile"
Enhanced: "Implement a user profile page with avatar upload, personal information form, password change functionality, and account settings. Include validation, error handling, image cropping, and responsive design."

User's original prompt: "${prompt}"

Enhance this prompt by making it more detailed and actionable. Focus on:

UI/UX requirements and modern design patterns

Data validation, error handling, and accessibility considerations

Interactions, states, and performance optimizations

Functionality and user experience details

Create a professional, detailed prompt (60-120 words) that a developer could immediately start implementing. Return ONLY the enhanced prompt text, without explanations or formatting.`,
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

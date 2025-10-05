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
      prompt: `You are an expert AI prompt enhancer that creates detailed, actionable prompts for web application development. You take basic user requests and transform them into comprehensive, implementable specifications.

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

User's original prompt: "${prompt}"

Enhance this prompt by making it more detailed and actionable. Focus on:
- Specific technologies and frameworks (React, Next.js, shadcn/ui, etc.)
- UI/UX requirements and modern design patterns
- Data validation and error handling approaches
- Performance and accessibility considerations
- Integration with common development patterns

Create a professional, detailed prompt (60-120 words) that a developer could immediately start implementing.

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

import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const generatePromptSuggestionsSchema = z.object({
  count: z.number().min(1).max(10).default(6),
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
    const { count = 6 } = generatePromptSuggestionsSchema.parse(body)

    console.log('🎯 Generating prompt suggestions using Codestral')

    // Get Codestral model for generating prompt suggestions
    const codestralModel = getModel('codestral-latest')

    // Generate prompt suggestions using Codestral
    const result = await generateText({
      model: codestralModel,
      prompt: `Generate ${count} diverse and creative prompt suggestions for building web applications using AI. Each suggestion should be a complete, actionable prompt that users can use to create different types of web apps.

Requirements:
- Each prompt should be 10-25 words long
- Cover different categories: business, e-commerce, productivity, creative, social, utility
- Make them specific and inspiring
- Focus on modern web app concepts

Return a JSON array of objects, each with:
- "display": A short title (3-5 words) for the pill button
- "prompt": The full prompt text

Example format:
[
  {
    "display": "Landing Page",
    "prompt": "Create a modern landing page for my startup with hero section, features, and contact form"
  }
]

Generate ${count} unique suggestions:`,
    })

    console.log('🤖 Codestral generated suggestions:', result.text)

    // Parse the JSON response
    let suggestions
    try {
      suggestions = JSON.parse(result.text)
    } catch (parseError) {
      console.error('❌ Failed to parse Codestral response:', parseError)
      // Fallback suggestions if parsing fails
      suggestions = [
        { display: "Landing page", prompt: "Create a modern landing page for my startup" },
        { display: "Portfolio site", prompt: "Build a portfolio website to showcase my work" },
        { display: "Restaurant menu", prompt: "Design a restaurant website with menu" },
        { display: "E-commerce store", prompt: "Make an e-commerce store for clothing" },
        { display: "Blog with dark mode", prompt: "Create a blog website with dark mode" },
        { display: "Business website", prompt: "Build a business website with contact forms" }
      ]
    }

    return Response.json({
      success: true,
      suggestions: suggestions.slice(0, count)
    })

  } catch (error) {
    console.error('❌ Error generating prompt suggestions:', error)
    return Response.json(
      { error: 'Failed to generate prompt suggestions' },
      { status: 500 }
    )
  }
}
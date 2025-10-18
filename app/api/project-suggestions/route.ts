import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const generateProjectSuggestionSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  userId: z.string().min(1, 'User ID is required'),
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
    const { prompt, userId } = generateProjectSuggestionSchema.parse(body)

    // Verify user ID matches authenticated user
    if (userId !== user.id) {
      return Response.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    console.log('🎯 Generating project suggestion for prompt:', prompt)

    // Get Pixtral model for natural language understanding
    const pixtralModel = getModel('pixtral-12b-2409')

    // Generate project name and description using Pixtral
    const result = await generateText({
      model: pixtralModel,
      prompt: `Based on the following user request, generate a concise project name and detailed description for a web application project.

User Request: "${prompt}"

Please respond with a JSON object containing:
- "name": A short, catchy project name (max 30 characters)
- "description": A detailed description explaining what the app will do (max 50 characters)

Example response format:
{
  "name": "TaskMaster Pro",
  "description": "A comprehensive task management application with team collaboration features, deadline tracking, and progress visualization."
}

Make the name creative and the description specific to the user's request.`,
      temperature: 0.7,
    })

    console.log('🤖 Pixtral response:', result.text)

    // Parse the AI response as JSON
    let suggestion
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try parsing the entire response
        suggestion = JSON.parse(result.text)
      }

      // Validate the suggestion has required fields
      if (!suggestion.name || !suggestion.description) {
        throw new Error('Missing required fields')
      }

      // Ensure name is not too long
      if (suggestion.name.length > 50) {
        suggestion.name = suggestion.name.substring(0, 47) + '...'
      }

      // Ensure description is not too long
      if (suggestion.description.length > 300) {
        suggestion.description = suggestion.description.substring(0, 297) + '...'
      }

    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      console.log('Raw response:', result.text)

      // Fallback: generate basic suggestion from prompt
      const words = prompt.split(' ').slice(0, 3).join(' ')
      suggestion = {
        name: words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() + ' App',
        description: `A web application for ${prompt.toLowerCase()}.`
      }
    }

    console.log('✅ Generated project suggestion:', suggestion)

    return Response.json({
      success: true,
      suggestion: {
        name: suggestion.name,
        description: suggestion.description,
      }
    })

  } catch (error) {
    console.error('❌ Error generating project suggestion:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to generate project suggestion' },
      { status: 500 }
    )
  }
}
import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'

// In-memory cache for recently generated suggestions (simple deduplication)
// In production, this could be stored in Redis or database
let recentSuggestionsCache: Set<string> = new Set()
const MAX_CACHE_SIZE = 100

type Suggestion = {
  display: string
  prompt: string
}

// Input validation schema
const generatePromptSuggestionsSchema = z.object({
  count: z.number().min(1).max(15).default(15),
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
    const { count = 15 } = generatePromptSuggestionsSchema.parse(body)

    console.log('🎯 Generating prompt suggestions using Codestral')

    // Generate a unique seed for this session to ensure variety
    const sessionSeed = Date.now() + Math.random()
    const timestamp = new Date().toISOString()

    // Get Codestral model for generating prompt suggestions
    const codestralModel = getModel('codestral-latest')

    // Generate prompt suggestions using Codestral with deduplication instructions
    const result = await generateText({
      model: codestralModel,
      prompt: `Generate ${count} diverse and creative prompt suggestions for building web applications using AI. Each suggestion should be a complete, actionable prompt that users can use to create different types of web apps.

Requirements:
- Each prompt should be 10-25 words long
- Cover different categories: business, e-commerce, productivity, creative, social, utility, gaming, education, health, finance, AI projects
- Make them specific and inspiring
- Focus on modern web app concepts
- Generate UNIQUE suggestions - avoid common templates like "landing page", "portfolio", "blog"
- Include variety in technologies: React, Vue, Next.js, Svelte, etc.
- Include different app types: dashboards, tools, platforms, marketplaces, AI assistants, chatbots, etc.

Session info: ${timestamp} (seed: ${sessionSeed})

Return a JSON array of objects, each with:
- "display": A short title (3-5 words) for the pill button
- "prompt": The full prompt text

Example format:
[
  {
    "display": "Analytics Dashboard",
    "prompt": "Create a real-time analytics dashboard for tracking user engagement metrics"
  }
]

Generate ${count} unique suggestions:`,
    })

    console.log('🤖 Codestral generated suggestions:', result.text)

    // Parse the JSON response - handle markdown code blocks
    let suggestions: Suggestion[]
    try {
      let jsonText = result.text.trim()
      
      // Check if response is wrapped in markdown code blocks
      if (jsonText.startsWith('```json') && jsonText.endsWith('```')) {
        // Extract JSON from markdown code block
        jsonText = jsonText.slice(7, -3).trim() // Remove ```json and ```
      } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
        // Handle generic code blocks
        jsonText = jsonText.slice(3, -3).trim() // Remove ``` and ```
      }
      
      suggestions = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('❌ Failed to parse Codestral response:', parseError)
      console.error('Raw response:', result.text)
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

    // Deduplication logic: Filter out recently generated suggestions
    let uniqueSuggestions = suggestions.filter((suggestion: Suggestion) => {
      const suggestionKey = `${suggestion.display}:${suggestion.prompt}`.toLowerCase()
      if (recentSuggestionsCache.has(suggestionKey)) {
        return false // Skip duplicate
      }
      return true
    })

    // If we don't have enough unique suggestions, add some variety by regenerating
    // For now, we'll just take what we have and add to cache
    if (uniqueSuggestions.length < count && suggestions.length >= count) {
      // Take the first 'count' suggestions that aren't duplicates
      uniqueSuggestions = suggestions.slice(0, count).filter((suggestion: Suggestion) => {
        const suggestionKey = `${suggestion.display}:${suggestion.prompt}`.toLowerCase()
        return !recentSuggestionsCache.has(suggestionKey)
      })
    }

    // Add new suggestions to cache
    uniqueSuggestions.forEach((suggestion: Suggestion) => {
      const suggestionKey = `${suggestion.display}:${suggestion.prompt}`.toLowerCase()
      recentSuggestionsCache.add(suggestionKey)
    })

    // Maintain cache size limit
    if (recentSuggestionsCache.size > MAX_CACHE_SIZE) {
      // Simple cache cleanup - remove oldest entries (in production, use LRU)
      const cacheArray = Array.from(recentSuggestionsCache)
      recentSuggestionsCache = new Set(cacheArray.slice(-MAX_CACHE_SIZE))
    }

    return Response.json({
      success: true,
      suggestions: uniqueSuggestions.slice(0, count)
    })

  } catch (error) {
    console.error('❌ Error generating prompt suggestions:', error)
    return Response.json(
      { error: 'Failed to generate prompt suggestions' },
      { status: 500 }
    )
  }
}
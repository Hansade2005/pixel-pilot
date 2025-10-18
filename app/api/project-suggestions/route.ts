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
      prompt: `You are an expert product naming specialist and technical writer. Your task is to generate a professional, memorable project name and a clear, comprehensive description based on the user's request.

# User Request
"${prompt}"

# Your Task
Analyze the user's request and create:
1. **Project Name**: A catchy, professional, and memorable name
2. **Description**: A detailed, clear explanation of what the application does

# Project Name Guidelines

**Style Principles:**
- **Memorable**: Easy to remember and pronounce
- **Professional**: Suitable for a real product
- **Relevant**: Reflects the app's purpose or key feature
- **Unique**: Avoid generic names like "App Builder" or "My Tool"
- **Modern**: Use contemporary naming conventions

**Naming Patterns to Consider:**
- **Compound words**: TaskFlow, DataSync, CodeCraft, MindMap
- **Portmanteau**: Combining words (Snapchat = Snap + Chat, Pinterest = Pin + Interest)
- **Descriptive + Pro/Hub/Kit/Lab**: AnalyticsPro, DesignHub, BuildKit, CodeLab
- **Action-based**: TrackIt, ShipFast, BuildRight, MoveOn
- **Metaphorical**: Compass (navigation), Atlas (maps), Beacon (guidance)
- **Single word**: Notion, Slack, Discord, Stripe (if appropriate)
- **Playful suffixes**: -ly, -ify, -io, -hub, -base, -wise

**Avoid:**
- Generic terms: "The App", "My Project", "Web App"
- Overly long names: Keep it concise and punchy
- Hard to spell names: Should be intuitive
- Trendy misspellings unless intentional: "Taskr", "Buildr" (use sparingly)
- Names that are too similar to existing major products

**Character Limit**: Maximum 30 characters (strictly enforce)

**Examples of GOOD names:**
- Expense tracking → "SplitWise" or "ExpenseFlow"
- Recipe finder → "ChefMate" or "RecipeRadar"
- Code editor → "CodeCanvas" or "DevStudio"
- Analytics dashboard → "MetricHub" or "DataPulse"

# Description Guidelines

**Structure:**
Start with what the app IS, then explain key features and benefits.

**Formula**: [App Type] that [primary function] with [key features/benefits]

**Content Requirements:**
- **Opening**: Clearly state what type of application it is
- **Core Function**: Explain the main purpose/problem it solves
- **Key Features**: Mention 2-4 standout features that make it valuable
- **User Benefit**: Imply or state how it helps users
- **Technical Context** (if relevant): Mention if it uses AI, real-time sync, etc.

**Style:**
- **Clear and specific**: No vague language
- **Professional tone**: Business-appropriate
- **Action-oriented**: Focus on what users can DO
- **Feature-rich**: Show the app's capabilities
- **Concise**: Every word counts

**Character Limit**: Maximum 200 characters (strictly enforce)

**Examples of GOOD descriptions:**
- "A collaborative task management platform with real-time updates, deadline tracking, progress visualization, and team communication features for remote teams."
- "An AI-powered recipe recommendation engine that suggests meals based on available ingredients, dietary preferences, and nutritional goals with shopping list generation."
- "A cryptocurrency portfolio tracker with live price updates, profit/loss analytics, multi-wallet support, and automated tax reporting for investors."

**Examples of BAD descriptions:**
- "An app for tasks" (too vague)
- "The best project management tool ever made" (subjective, not descriptive)
- "A web application" (doesn't say what it does)
- "Helps users manage their stuff better" (unclear what "stuff" means)

# Analysis Process

1. **Parse the user request**: Identify the core app concept
2. **Extract key features**: What functionalities are mentioned or implied?
3. **Identify the target user**: Who will use this app?
4. **Determine the value proposition**: What problem does it solve?
5. **Consider technical aspects**: Does it use AI, real-time features, APIs, etc.?
6. **Choose naming strategy**: Which naming pattern fits best?
7. **Craft the description**: Follow the formula and include essential details

# Special Considerations

**For AI-powered apps:**
- Consider names with: Mind, Brain, Smart, Genius, AI, Neural, etc.
- Mention "AI-powered" or "intelligent" in description
- Highlight what the AI does (generates, analyzes, recommends, predicts)

**For real-time/collaborative apps:**
- Consider names with: Sync, Live, Connect, Together, Team, etc.
- Mention "real-time", "collaborative", "live updates" in description
- Emphasize teamwork or synchronization features

**For productivity tools:**
- Consider names with: Flow, Track, Manage, Organize, Plan, etc.
- Focus on efficiency, organization, time-saving in description
- Highlight workflow improvements

**For creative tools:**
- Consider names with: Create, Design, Craft, Build, Studio, etc.
- Emphasize creative possibilities in description
- Mention customization or flexibility

**For data/analytics apps:**
- Consider names with: Metric, Data, Insight, Analytics, Pulse, etc.
- Highlight visualization, tracking, or reporting in description
- Mention data sources or integration capabilities

**For e-commerce/marketplace apps:**
- Consider names with: Market, Shop, Store, Trade, Commerce, etc.
- Mention buyer/seller features, payments, inventory in description
- Highlight what makes the marketplace unique

# Quality Checklist

Before finalizing, verify:
- ✅ Name is under 30 characters
- ✅ Description is under 200 characters
- ✅ Name is memorable and professional
- ✅ Description clearly explains what the app does
- ✅ Key features are mentioned
- ✅ Target audience or use case is clear
- ✅ No spelling or grammar errors
- ✅ Technical aspects are accurately reflected
- ✅ Output is valid JSON format

# Output Format

Return ONLY a valid JSON object with this exact structure:

{
  "name": "ProjectName",
  "description": "A clear and detailed description of what the application does, including key features and benefits."
}

# Critical Rules
1. **STRICTLY follow character limits**: Name ≤ 30 chars, Description ≤ 200 chars
2. **NO markdown formatting**: Plain text only in JSON
3. **NO explanations**: Only return the JSON object
4. **NO placeholder text**: Every word must be specific to the user's request
5. **Valid JSON**: Ensure proper escaping of quotes if needed
6. **Professional quality**: This should look like a real product

# Examples

User Request: "Build a collaborative whiteboard for remote teams"
{
  "name": "TeamCanvas",
  "description": "A real-time collaborative whiteboard application for remote teams with infinite canvas, multi-user cursors, drawing tools, sticky notes, and seamless synchronization."
}

User Request: "Create an AI recipe generator based on ingredients"
{
  "name": "ChefMind",
  "description": "An AI-powered recipe recommendation engine that generates personalized meal suggestions based on available ingredients, dietary restrictions, and nutritional preferences."
}

User Request: "Develop a cryptocurrency portfolio tracker"
{
  "name": "CryptoLens",
  "description": "A comprehensive cryptocurrency portfolio tracker with live price updates, profit/loss analytics, multi-wallet support, transaction history, and tax reporting features."
}

Now, generate a professional project name and description for the user's request.`,
      temperature: 0.85,
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
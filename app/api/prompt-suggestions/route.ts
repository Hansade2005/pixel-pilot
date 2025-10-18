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
  count: z.number().min(1).max(20).default(30),
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
    const { count = 30 } = generatePromptSuggestionsSchema.parse(body)

    console.log('🎯 Generating prompt suggestions using Codestral')

    // Generate a unique seed for this session to ensure variety
    const sessionSeed = Date.now() + Math.random()
    const timestamp = new Date().toISOString()

    // Get Codestral model for generating prompt suggestions
    const codestralModel = getModel('codestral-latest')

    // Generate prompt suggestions using Codestral with deduplication instructions
    const result = await generateText({
      model: codestralModel,
      prompt: `You are an expert AI prompt engineer specializing in React and Next.js web application development. Your task is to generate ${count} highly specific, creative, and immediately actionable prompt suggestions that inspire users to build innovative web applications using React (Vite) or Next.js.

# Core Principles
- **Specificity Over Generality**: Each prompt must describe a concrete, well-defined application with clear purpose
- **Actionability**: Prompts should be ready-to-use without further clarification
- **Innovation**: Push beyond common templates—think cutting-edge, niche, or uniquely useful applications
- **Diversity**: Cover wide range of industries, use cases, and technical approaches
- **Inspiration**: Make users excited to build something they hadn't thought of before
- **Stack-Appropriate**: All suggestions must be buildable with React (Vite) or Next.js

# Supported Technology Stack
- **Frontend Framework**: React with Vite OR Next.js
- **When to Use React (Vite)**: SPAs, client-heavy apps, interactive tools, dashboards, games
- **When to Use Next.js**: Full-stack apps, SSR/SSG needs, API routes, SEO-critical apps, multi-page apps
- **Styling**: Tailwind CSS (primary), CSS Modules, styled-components
- **State Management**: React hooks (useState, useContext, useReducer), Zustand, or similar
- **UI Libraries**: shadcn/ui, Radix UI, Headless UI, Lucide icons
- **Data Fetching**: Fetch API, React Query, SWR
- **Backend (Next.js only)**: API routes, server actions, middleware
- **Database Integration**: Supabase, Firebase, Vercel Postgres, MongoDB Atlas (via API)
- **Real-time**: WebSockets, Supabase real-time, Pusher, Socket.io
- **Authentication**: NextAuth, Supabase Auth, Clerk, Auth0
- **AI Integration**: OpenAI API, Anthropic API, Hugging Face, Replicate

# Categories to Cover (distribute evenly across ${count} prompts)
- **Business**: CRM, project management, invoicing, HR, inventory, analytics
- **E-commerce**: Marketplaces, subscription platforms, product catalogs, vendor management
- **Productivity**: Task managers, note-taking, time tracking, collaboration tools, automation
- **Creative**: Design tools, content generators, media editors, portfolio builders
- **Social**: Community platforms, networking apps, social feeds, collaboration spaces
- **Utility**: Calculators, converters, generators, validators, scrapers, API tools
- **Gaming**: Browser games, game mechanics, score trackers, gaming communities
- **Education**: Learning platforms, quiz builders, course creators, study tools
- **Health**: Fitness trackers, meal planners, mental health tools, wellness dashboards
- **Finance**: Budget trackers, expense splitters, investment calculators, payment processors
- **AI/ML**: Chatbots, recommendation engines, data analyzers, NLP tools, vision apps, AI assistants
- **Developer Tools**: Code generators, testing platforms, documentation builders, API testers
- **Data & Analytics**: Visualization dashboards, reporting tools, data explorers, BI platforms
- **Communication**: Chat apps, messaging systems, collaboration tools, comment systems
- **Entertainment**: Media players, content aggregators, streaming interfaces, discovery platforms

# Prompt Construction Formula

Each prompt should include:
1. **Action Verb**: "Build", "Create", "Design", "Develop" (vary these)
2. **Specific App Type**: Be precise (not "e-commerce site" but "subscription box platform for curated coffee deliveries")
3. **Key Features**: What makes this unique or valuable (1-2 standout features)
4. **Tech Context** (optional): "with real-time updates", "using AI", "with drag-and-drop builder", etc.

# Style Guidelines
- **Length**: 10-25 words (strictly enforce)
- **Tone**: Professional yet inspiring, direct and clear
- **Avoid**: Generic terms like "landing page", "portfolio site", "simple blog", "basic website", "todo app"
- **Avoid**: Overly complex multi-clause sentences
- **Include**: Specific industries, real-world use cases, modern React/Next.js features

# Feature Variety to Include (React/Next.js Specific)
- **Client-side interactivity**: Drag-and-drop, animations, real-time updates, canvas manipulation
- **Server-side features** (Next.js): SSR, SSG, ISR, API routes, server actions, middleware
- **AI integration**: OpenAI/Anthropic API, chatbots, content generation, image analysis
- **Real-time collaboration**: WebSockets, Supabase real-time, shared state
- **Data visualization**: Charts (Recharts, Chart.js), dashboards, interactive graphs
- **File handling**: Upload, processing, preview, download
- **Authentication & Authorization**: User management, protected routes, role-based access
- **Payment integration**: Stripe, PayPal, subscription management
- **Search & filtering**: Full-text search, faceted filters, autocomplete
- **Markdown/Rich text**: Editors, renderers, note-taking
- **Progressive Web App**: Offline support, push notifications, installable
- **Internationalization**: Multi-language support
- **Accessibility**: WCAG compliance, keyboard navigation, screen reader support
- **Performance**: Code splitting, lazy loading, image optimization
- **API integration**: Third-party APIs, webhooks, data aggregation

# Examples of GOOD Prompts (for reference, don't copy):
- "Build a Next.js markdown-based documentation site with AI-powered search and dark mode theming"
- "Create a React Vite kanban board with drag-and-drop, real-time collaboration, and custom workflows"
- "Design a Next.js meal planning app with recipe recommendations, shopping lists, and nutritional tracking"
- "Develop a React dashboard for cryptocurrency portfolio tracking with live price updates and profit/loss charts"

# Examples of BAD Prompts (avoid these):
- "Create a landing page for a business" (too generic)
- "Build a simple blog" (too basic, overused)
- "Make a portfolio website" (too common)
- "Design a todo app" (overdone, not inspiring)
- "Build a website with Vue" (wrong tech stack)

# React (Vite) vs Next.js Guidance

**Use React (Vite) for prompts involving:**
- Single-page applications (SPAs)
- Client-heavy interactive tools
- Real-time dashboards
- Games and simulations
- Drawing/design tools
- Data visualization tools
- Browser-based utilities
- Apps that don't need SEO

**Use Next.js for prompts involving:**
- Multi-page applications
- Content-heavy sites (blogs, docs, marketing)
- E-commerce platforms
- User authentication systems
- Full-stack applications with backend
- Apps requiring SSR/SSG
- API integrations and backends
- SEO-critical applications
- Database-driven apps

# Uniqueness Requirements
- **NO duplicates** within the ${count} prompts generated
- **NO clichés**: Avoid the most common tutorial apps
- **NO vague concepts**: Every prompt should feel like a real product idea
- Each prompt should solve a REAL problem or fulfill a REAL need
- Think: "Would someone actually want to use this?"
- **NO mentions of other frameworks**: Don't mention Vue, Svelte, Angular, or any non-React frameworks

# Diversity Checklist (ensure variety across all ${count} prompts)
- Mix of React (Vite) and Next.js suggestions
- Mix of B2B and B2C applications
- Mix of consumer and enterprise tools
- Mix of single-user and multi-user apps
- Mix of simple utilities and complex platforms
- Mix of data-heavy and interaction-heavy apps
- Mix of content-focused and tool-focused apps
- Include at least 2-3 prompts with AI integration
- Include at least 2-3 prompts with real-time features
- Include at least 1-2 niche/specialized tools
- Include variety in complexity (simple tools to full platforms)

# Session Context
- Timestamp: ${timestamp}
- Session Seed: ${sessionSeed}
- Use these to ensure variety across different generation sessions

# Output Format
Return ONLY a valid JSON array with ${count} objects. Each object must have:
- "display": A compelling, concise title (3-5 words, title case)
- "prompt": The complete actionable prompt (10-25 words)

Format:
[
  {
    "display": "AI Code Reviewer",
    "prompt": "Build a Next.js code review platform with AI-powered suggestions and team collaboration features"
  },
  {
    "display": "Expense Splitter",
    "prompt": "Create a React app for splitting bills among friends with receipt scanning and payment tracking"
  }
]

# Critical Reminders
1. Count MUST equal ${count} suggestions
2. Every prompt MUST be unique and specific
3. NO generic templates or tutorial apps
4. STRICT 10-25 word limit per prompt
5. Output MUST be valid JSON only (no markdown, no explanations)
6. Each "display" should be catchy and descriptive
7. Think: "Would I be excited to build this?"
8. **ONLY use React (Vite) or Next.js** - no other frameworks
9. Consider which stack (React vs Next.js) is most appropriate for each prompt
10. Focus on modern, practical applications that showcase React/Next.js strengths

Generate ${count} unique, inspiring, and actionable web app prompts now:`,
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
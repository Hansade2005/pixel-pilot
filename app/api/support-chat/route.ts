import { streamText, tool, stepCountIs } from 'ai'
import { createMistral } from '@ai-sdk/mistral'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'

// Create Mistral provider for Pixtral (supports vision)
const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

// Interface for docs.json structure
interface DocSection {
  title: string
  overview: string
  content: string
  search_keywords: string[]
}

interface DocsData {
  sections: DocSection[]
}

// Cache for docs data
let cachedDocsData: DocsData | null = null

// Function to load docs data
async function loadDocsData(): Promise<DocsData> {
  if (cachedDocsData) return cachedDocsData

  try {
    const docsPath = path.join(process.cwd(), 'public', 'docs.json')
    const docsContent = await fs.readFile(docsPath, 'utf-8')
    cachedDocsData = JSON.parse(docsContent)
    return cachedDocsData!
  } catch (error) {
    console.error('Failed to load docs.json:', error)
    return { sections: [] }
  }
}

// Semantic topic patterns for documentation search (inspired by semantic_code_navigator)
const SEMANTIC_PATTERNS: Array<{
  topic: string
  pattern: RegExp
  keywords: string[]
  relevanceBoost: number
  description: string
}> = [
  {
    topic: 'ai_models',
    pattern: /\b(AI model|Mistral|Claude|Grok|Pixtral|LLM|Multi-Model|vision|language model)\b/gi,
    keywords: ['model', 'models', 'ai', 'llm', 'what model', 'which model', 'supported model'],
    relevanceBoost: 20,
    description: 'AI models and capabilities'
  },
  {
    topic: 'frameworks',
    pattern: /\b(Next\.js|Vite|React|Expo|framework|SSR|SSG|mobile app|native app)\b/gi,
    keywords: ['framework', 'nextjs', 'vite', 'react', 'expo', 'mobile'],
    relevanceBoost: 15,
    description: 'Supported frameworks'
  },
  {
    topic: 'deployment',
    pattern: /\b(deploy|deployment|hosting|Vercel|Netlify|production|publish|domain|CDN)\b/gi,
    keywords: ['deploy', 'deployment', 'host', 'hosting', 'vercel', 'netlify', 'publish'],
    relevanceBoost: 15,
    description: 'Deployment and hosting'
  },
  {
    topic: 'database',
    pattern: /\b(database|Supabase|storage|backend|PostgreSQL|real-time|authentication)\b/gi,
    keywords: ['database', 'supabase', 'storage', 'data', 'backend', 'auth'],
    relevanceBoost: 15,
    description: 'Database and storage'
  },
  {
    topic: 'features',
    pattern: /\b(feature|capability|voice|visual editing|click-to-edit|AI assistant|conversational)\b/gi,
    keywords: ['feature', 'features', 'capability', 'what can', 'how to', 'support'],
    relevanceBoost: 12,
    description: 'Platform features'
  },
  {
    topic: 'pricing',
    pattern: /\b(pricing|price|cost|plan|tier|free|pro|enterprise|subscription|billing)\b/gi,
    keywords: ['pricing', 'price', 'cost', 'plan', 'free', 'pro', 'how much'],
    relevanceBoost: 18,
    description: 'Pricing and plans'
  },
  {
    topic: 'integrations',
    pattern: /\b(integration|GitHub|Stripe|OAuth|API|webhook|connect|MCP|SDK)\b/gi,
    keywords: ['integration', 'github', 'stripe', 'connect', 'api', 'webhook'],
    relevanceBoost: 12,
    description: 'Third-party integrations'
  },
  {
    topic: 'getting_started',
    pattern: /\b(getting started|begin|create project|tutorial|guide|setup|first project)\b/gi,
    keywords: ['start', 'getting started', 'begin', 'create', 'tutorial', 'new project'],
    relevanceBoost: 12,
    description: 'Getting started guides'
  },
  {
    topic: 'commands',
    pattern: /\b(slash command|\/\w+|shortcut|keyboard|command)\b/gi,
    keywords: ['command', 'commands', 'slash', 'shortcut', '/help', '/export'],
    relevanceBoost: 12,
    description: 'Commands and shortcuts'
  },
  {
    topic: 'founder',
    pattern: /\b(Hans Ade|founder|CEO|Anye|created|built|Pixelways)\b/gi,
    keywords: ['founder', 'who made', 'who created', 'hans', 'ceo', 'about'],
    relevanceBoost: 15,
    description: 'Founder and company info'
  }
]

// Analyze query to find matching semantic patterns and build expanded search
function analyzeQueryIntent(query: string): { patterns: typeof SEMANTIC_PATTERNS, expandedQuery: string } {
  const lowerQuery = query.toLowerCase()
  const matchedPatterns: typeof SEMANTIC_PATTERNS = []

  // Find all patterns whose keywords match the query
  for (const pattern of SEMANTIC_PATTERNS) {
    const matchesKeyword = pattern.keywords.some(kw => lowerQuery.includes(kw))
    if (matchesKeyword) {
      matchedPatterns.push(pattern)
    }
  }

  // Build expanded query from matched patterns OR use original query
  let expandedQuery: string
  if (matchedPatterns.length > 0) {
    // Combine all matched pattern regexes
    const patternSources = matchedPatterns.map(p =>
      p.pattern.source.replace(/\\b\(/g, '(').replace(/\)\\b/g, ')')
    )
    expandedQuery = patternSources.join('|')
  } else {
    // Escape special regex chars and search literally
    expandedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return { patterns: matchedPatterns, expandedQuery }
}

// Enhanced semantic search function (inspired by semantic_code_navigator from chat-v2)
function searchDocs(docsData: DocsData, query: string, maxResults: number = 3): string {
  try {
    // Analyze query intent and get matching patterns
    const { patterns: matchedPatterns, expandedQuery } = analyzeQueryIntent(query)

    // Create regex from expanded query
    const regex = new RegExp(expandedQuery, 'gi')

    const results: Array<{
      title: string
      overview: string
      topic: string
      score: number
      matchDetails: string[]
      snippets: string[]
    }> = []

    for (const section of docsData.sections) {
      const matchDetails: string[] = []
      const snippets: string[] = []
      let score = 0
      let topicMatched = 'general'

      // 1. Title match (highest priority)
      regex.lastIndex = 0
      if (regex.test(section.title)) {
        score += 25
        matchDetails.push(`Title: "${section.title}"`)
      }

      // 2. Overview match
      regex.lastIndex = 0
      if (regex.test(section.overview)) {
        score += 15
        matchDetails.push(`Overview matched`)
      }

      // 3. Keywords match
      let keywordHits = 0
      for (const keyword of section.search_keywords) {
        regex.lastIndex = 0
        if (regex.test(keyword)) {
          keywordHits++
          score += 8
        }
      }
      if (keywordHits > 0) {
        matchDetails.push(`${keywordHits} keyword(s)`)
      }

      // 4. Apply semantic pattern boosts (key improvement from semantic_code_navigator)
      for (const pattern of matchedPatterns) {
        pattern.pattern.lastIndex = 0
        const patternMatches = section.content.match(pattern.pattern)
        if (patternMatches && patternMatches.length > 0) {
          const boost = Math.min(patternMatches.length * 4, pattern.relevanceBoost)
          score += boost
          topicMatched = pattern.topic
          matchDetails.push(`${pattern.description} (${patternMatches.length}x)`)
        }
      }

      // 5. Content matches with snippet extraction
      regex.lastIndex = 0
      const contentMatches = section.content.match(regex)
      if (contentMatches) {
        score += Math.min(contentMatches.length * 3, 18)

        // Extract meaningful snippets around matches
        const lines = section.content.split('\n')
        let snippetCount = 0

        for (let i = 0; i < lines.length && snippetCount < 3; i++) {
          const line = lines[i].trim()
          if (line.length < 15) continue

          regex.lastIndex = 0
          if (regex.test(line)) {
            // Include context: check if next line is a list item
            let snippet = line
            if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
              snippet += '\n  ' + lines[i + 1].trim()
              if (i + 2 < lines.length && lines[i + 2].trim().startsWith('-')) {
                snippet += '\n  ' + lines[i + 2].trim()
              }
            }
            snippets.push(snippet.slice(0, 350))
            snippetCount++
          }
        }
      }

      // 6. Exact query match bonus
      if (section.title.toLowerCase().includes(query.toLowerCase())) {
        score += 12
      }
      if (section.overview.toLowerCase().includes(query.toLowerCase())) {
        score += 8
      }

      if (score > 0) {
        results.push({
          title: section.title,
          overview: section.overview,
          topic: topicMatched,
          score,
          matchDetails,
          snippets
        })
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, maxResults)

    if (topResults.length === 0) {
      return `No documentation found for "${query}". Try different keywords or ask me directly - I have comprehensive knowledge about PiPilot!`
    }

    // Format output with rich details
    const topicDesc = matchedPatterns.length > 0
      ? matchedPatterns.map(p => p.description).join(', ')
      : 'general search'

    let output = `📚 **Search Results** for "${query}" (${topicDesc})\n\n`

    for (let i = 0; i < topResults.length; i++) {
      const r = topResults[i]
      output += `**${i + 1}. ${r.title}** (score: ${r.score})\n`
      output += `${r.overview}\n`

      if (r.matchDetails.length > 0) {
        output += `_Matched: ${r.matchDetails.slice(0, 3).join(', ')}_\n`
      }

      if (r.snippets.length > 0) {
        output += `**Key content:**\n`
        for (const snip of r.snippets.slice(0, 2)) {
          output += `> ${snip}\n`
        }
      }
      output += `\n`
    }

    return output
  } catch (error) {
    console.error('Search error:', error)
    return `Search error for "${query}". Try simpler terms or ask me directly!`
  }
}

// Function to get full section content
function getSectionContent(docsData: DocsData, sectionTitle: string): string {
  const section = docsData.sections.find(
    s => s.title.toLowerCase() === sectionTitle.toLowerCase()
  )

  if (!section) {
    return `Section "${sectionTitle}" not found. Available sections: ${docsData.sections.map(s => s.title).join(', ')}`
  }

  return `# ${section.title}\n\n**Overview:** ${section.overview}\n\n${section.content}`
}

// PiPilot knowledge base - comprehensive documentation
const PIPILOT_KNOWLEDGE = `
# PiPilot - Complete Knowledge Base

## About PiPilot
PiPilot is Canada's first Agentic Vibe Coding Platform - an AI-powered application builder that helps you create web applications through natural conversation. Founded by Hans Ade (Anye Happiness Ade) on July 29, 2025, PiPilot was born out of frustration with existing AI coding tools like Lovable, Bolt, Cursor, and Windsurf that didn't provide the full automation needed.

### The Founder - Hans Ade
- Full Name: Anye Happiness Ade (prefers Hans Ade)
- Role: Founder & CEO of PiPilot
- Education: Bachelor's degree in Education from Atlantic International University
- Co-Founder: Pixelways Solutions Inc (Ontario, Canada)
- Location: Canada
- Contact: hello@pipilot.dev, hanscadx8@gmail.com

### Why PiPilot Was Created
Hans was tired of the limitations in existing AI coding tools. On July 29, 2025, after yet another frustrating experience with tools that required too much manual intervention, he decided to build something better - a platform that truly automates the development process through conversational AI.

## Getting Started

### Creating Your First Project
1. Sign in to your PiPilot account
2. Click "New Project" in your workspace
3. Give your project a name and description
4. Start chatting with the AI - describe what you want to build
5. Watch as PiPilot generates your application in real-time

### No Coding Required
PiPilot is designed for everyone - from complete beginners to experienced developers. Simply describe what you want in plain English, and the AI will generate the code for you.

## Features

### Conversational AI Engine
- Multi-Model Integration: Mistral Pixtral, Grok Code Fast 1, Claude Sonnet 4.5
- Voice Integration: Speech-to-text and voice commands
- Natural Language Processing: Transform conversations into functional applications

### Visual Development
- Click-to-Edit Interface: Click any element to edit
- Real-Time Styling: Instant property modifications
- 100+ Google Fonts: Extensive font library
- Theme Switching: One-click theme application

### Supported Frameworks
- **Next.js**: Full-stack web applications with SSR/SSG
- **Vite + React**: Client-side applications and SPAs
- **Expo**: Cross-platform mobile applications

### AI Memory
AI Memory allows PiPilot to remember context about your project, preferences, and past conversations. The AI gets smarter about your specific project over time.

### Slash Commands
Type '/' in the chat to see available commands:
- /help - Get help
- /settings - Open settings
- /clear - Clear chat
- /export - Export project

### Search & Replace
Use Ctrl/Cmd + Shift + F to search across all files. The Search & Replace feature allows bulk changes with preview before applying.

## Integrations

### GitHub Integration
- Repository access and cloning
- Push deployments
- Branch management
- Pull request creation

### Vercel Deployments
- One-click deployments
- Custom domains
- Environment variables
- Global CDN

### Netlify Hosting
- Static site hosting
- Form submissions
- Serverless functions

### Supabase Database
- Real-time database
- Authentication
- Storage
- Edge functions

### Stripe Payments
- Payment processing
- Subscriptions
- Webhooks

## Pricing

### Free Tier
- Limited AI messages per month
- Basic features

### Pro Plan
- More AI messages
- Advanced features
- Priority support

### Enterprise
- Unlimited usage
- Custom features
- Dedicated support

## Technical Support

### Common Issues

**Preview not loading?**
1. Refresh the page
2. Clear browser cache
3. Check for JavaScript errors
4. Try a different browser

**Export project:**
Click Export button or use /export command

**Connect custom domain:**
Pro and Enterprise users can configure custom domains in Project Settings > Domain

### Contact Support
- Live Chat: Available on all pages (except workspace with project open)
- Email: hello@pipilot.dev
- Community: Join our Discord community

## SWE Agent

The PiPilot SWE Agent is a GitHub App that monitors repositories and responds to mentions. Simply mention @pipilot-swe-agent in issues or PRs to get AI-powered code generation and pull request creation.

### How It Works
1. Install the PiPilot SWE Agent GitHub App
2. Create an issue or comment with @pipilot-swe-agent
3. The agent analyzes your codebase and generates code
4. Review and merge the created pull request

## MCP Server

The PiPilot MCP HTTP Server provides AI agents with seamless access to PiPilot database operations via HTTP endpoints. Connect your favorite AI assistants (Claude, Cursor, VS Code) to your PiPilot database.

### Available Tools
- pipilot_list_tables
- pipilot_read_table
- pipilot_fetch_records
- pipilot_insert_record
- pipilot_update_record
- pipilot_delete_record

## Security

- Encrypted storage for all API tokens
- OAuth 2.0 compliance
- GDPR compliant
- No data sharing with third parties

## FAQ

**Is PiPilot free?**
Yes, there's a free tier with limited AI messages. Pro and Enterprise plans offer more features.

**Do I need coding experience?**
No! PiPilot understands natural language. Describe what you want in plain English.

**What can I build?**
Landing pages, portfolios, dashboards, e-commerce sites, blogs, SaaS applications, admin panels, and more.

**Can I export my code?**
Yes! Click Export or use /export command to download your project as a ZIP file.

**Is my code secure?**
Absolutely. We use industry-standard encryption. Your code is only accessible to you.
`

// Interface for message content parts
interface TextContent {
  type: 'text'
  text: string
}

interface ImageContent {
  type: 'image'
  image: string // base64 data URL
}

type ContentPart = TextContent | ImageContent

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: Message[] }

    // Get Mistral Pixtral model (supports vision)
    const model = mistralProvider('pixtral-12b-2409')

    // Load docs data for tools
    const docsData = await loadDocsData()

    // Create the system prompt with knowledge base
    const systemPrompt = `You are PiPilot's friendly and knowledgeable AI support assistant. Your name is "PiPilot AI".

Your role is to help users with questions about PiPilot, troubleshoot issues, and provide guidance on using the platform effectively.

IMPORTANT GUIDELINES:
1. Be friendly, helpful, and concise
2. FIRST check the KNOWLEDGE BASE below - it contains comprehensive information about PiPilot features, AI models, frameworks, integrations, and more
3. For common questions (models, features, frameworks, pricing, founder, getting started), answer from the KNOWLEDGE BASE directly - don't search
4. Only use search_docs tool when: (a) question is very specific/technical, (b) you need exact documentation wording, (c) the knowledge base doesn't cover the topic
5. Use markdown formatting for better readability (bold, lists, code blocks when needed)
6. Keep responses focused and not too long
7. Always be positive about PiPilot's capabilities
8. If users have technical issues, provide step-by-step troubleshooting
9. Mention the founder Hans Ade when relevant to company questions
10. When users share screenshots, carefully analyze them to understand their issue and provide specific help

SUPPORTED AI MODELS (from Knowledge Base):
- **Mistral Pixtral**: Advanced vision and language processing (used for this chat)
- **Grok Code Fast 1**: Specialized fast code generation
- **Claude Sonnet 4.5**: High-quality code generation and analysis

AVAILABLE TOOLS (use sparingly - prefer knowledge base):
- search_docs: Search PiPilot documentation using regex patterns. Use expanded queries like "model|Mistral|Claude" not just "models"
- get_section_content: Get full content of a specific documentation section by title

KNOWLEDGE BASE (Quick Reference):
${PIPILOT_KNOWLEDGE}

Remember: You represent PiPilot. Be professional, helpful, and make users feel supported! Answer from the knowledge base when possible.`

    // Transform messages to handle multimodal content
    const transformedMessages = messages.map((msg: Message) => {
      if (typeof msg.content === 'string') {
        return msg
      }
      // Handle multimodal messages (text + images)
      const transformedContent = msg.content.map((part: ContentPart) => {
        if (part.type === 'text') {
          return { type: 'text' as const, text: part.text }
        } else if (part.type === 'image') {
          // Ensure image is properly formatted for AI SDK
          // AI SDK accepts: URL, data URI, base64 string, Uint8Array, Buffer
          const imageData = part.image
          return { type: 'image' as const, image: imageData }
        }
        return part
      })

      // Log image count for debugging
      const imageCount = transformedContent.filter(p => p.type === 'image').length
      if (imageCount > 0) {
        console.log(`Processing message with ${imageCount} image(s)`)
      }

      return {
        role: msg.role,
        content: transformedContent
      }
    })

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: transformedMessages,
      maxTokens: 1024,
      temperature: 0.7,
      tools: {
        search_docs: tool({
          description: 'Search PiPilot documentation using regex patterns. Use this to find relevant documentation about features, integrations, troubleshooting, etc. Returns matching sections with snippets.',
          parameters: z.object({
            query: z.string().describe('Regex pattern to search for (e.g., "deploy.*vercel", "database|supabase", "pricing", "slash.*command")'),
            maxResults: z.number().optional().default(3).describe('Maximum number of results to return (default: 3)')
          }),
          execute: async ({ query, maxResults }) => {
            return searchDocs(docsData, query, maxResults)
          }
        }),
        get_section_content: tool({
          description: 'Get the full content of a specific documentation section by its title. Use this when you need detailed information from a specific section.',
          parameters: z.object({
            sectionTitle: z.string().describe('The exact title of the section (e.g., "PiPilot Features", "Supported Frameworks", "Integration System")')
          }),
          execute: async ({ sectionTitle }) => {
            return getSectionContent(docsData, sectionTitle)
          }
        })
      },
      stopWhen: stepCountIs(3), // Stop when max steps reached
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Support chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process your request. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

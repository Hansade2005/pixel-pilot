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

// Common query expansions for better search results
const QUERY_EXPANSIONS: Record<string, string> = {
  'models': 'model|Multi-Model|Mistral|Claude|Grok|LLM|AI engine',
  'model': 'model|Multi-Model|Mistral|Claude|Grok|LLM|AI engine',
  'ai': 'AI|artificial intelligence|conversational|LLM|machine learning',
  'deploy': 'deploy|deployment|hosting|Vercel|Netlify|publish',
  'database': 'database|Supabase|storage|backend|data',
  'auth': 'auth|authentication|login|signup|OAuth',
  'mobile': 'mobile|Expo|iOS|Android|native|app',
  'framework': 'framework|Next.js|Vite|React|Expo',
  'payment': 'payment|Stripe|billing|subscription|checkout',
}

// Function to expand query for better search results
function expandQuery(query: string): string {
  const lowerQuery = query.toLowerCase().trim()

  // Check if query matches any expansion
  for (const [key, expansion] of Object.entries(QUERY_EXPANSIONS)) {
    if (lowerQuery === key || lowerQuery.includes(key)) {
      return expansion
    }
  }

  return query
}

// Function to search docs using regex
function searchDocs(docsData: DocsData, query: string, maxResults: number = 3): string {
  try {
    // Expand query for better results
    const expandedQuery = expandQuery(query)

    // Create regex from query (case insensitive)
    const regex = new RegExp(expandedQuery, 'gi')

    const results: Array<{
      title: string
      overview: string
      matches: string[]
      score: number
      relevantSnippets: string[]
    }> = []

    for (const section of docsData.sections) {
      const matches: string[] = []
      const relevantSnippets: string[] = []
      let score = 0

      // Check title (highest priority)
      if (regex.test(section.title)) {
        score += 15
        matches.push(`Title match: "${section.title}"`)
      }
      regex.lastIndex = 0 // Reset regex

      // Check overview
      if (regex.test(section.overview)) {
        score += 8
        matches.push(`Overview match`)
      }
      regex.lastIndex = 0

      // Check keywords
      for (const keyword of section.search_keywords) {
        if (regex.test(keyword)) {
          score += 5
          matches.push(`Keyword: "${keyword}"`)
        }
        regex.lastIndex = 0
      }

      // Check content and extract matching snippets with context
      const contentMatches = section.content.match(regex)
      if (contentMatches) {
        // Give more weight to sections with multiple matches
        score += Math.min(contentMatches.length * 2, 20)

        // Extract context around matches - look for meaningful lines
        const lines = section.content.split('\n')
        let snippetCount = 0
        for (let i = 0; i < lines.length && snippetCount < 3; i++) {
          const line = lines[i]
          regex.lastIndex = 0
          if (regex.test(line) && line.trim().length > 15) {
            // Include the line and possibly the next line for context
            let snippet = line.trim()
            if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
              snippet += '\n' + lines[i + 1].trim()
            }
            relevantSnippets.push(snippet.slice(0, 300))
            matches.push(`Content: "${snippet.slice(0, 100)}..."`)
            snippetCount++
          }
        }
      }

      if (score > 0) {
        results.push({
          title: section.title,
          overview: section.overview,
          matches,
          score,
          relevantSnippets
        })
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, maxResults)

    if (topResults.length === 0) {
      return `No documentation found matching "${query}". Try a different search term or ask me directly - I have built-in knowledge about PiPilot.`
    }

    // Format results with snippets for better context
    let output = `Found ${topResults.length} relevant documentation section(s) for "${query}":\n\n`

    for (const result of topResults) {
      output += `## ${result.title}\n`
      output += `**Overview:** ${result.overview}\n`
      if (result.relevantSnippets.length > 0) {
        output += `**Relevant content:**\n`
        for (const snippet of result.relevantSnippets.slice(0, 2)) {
          output += `- ${snippet}\n`
        }
      }
      output += `\n`
    }

    return output
  } catch (error) {
    return `Search error: Invalid regex pattern. Please use a simpler search term.`
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

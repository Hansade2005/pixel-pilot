# PiPilot - AI Agent Context File

## What is PiPilot?

**PiPilot** is Canada's first Agentic Vibe Coding Platform - an AI-powered application builder that helps users create web applications through natural conversation. It's designed to be the most automated AI coding platform, surpassing tools like Lovable, Bolt, Cursor, and Windsurf.

**Tagline:** "Build apps by talking to AI"

## Founder

- **Name:** Hans Ade (Full name: Anye Happiness Ade)
- **Role:** Founder & CEO
- **Company:** Pixelways Solutions Inc (Ontario, Canada)
- **Contact:** hello@pipilot.dev, hanscadx8@gmail.com
- **Founded:** July 29, 2025

## Supported AI Models

PiPilot uses multiple AI models for different purposes:
- **Mistral Pixtral** - Vision-enabled model for the support chat (analyzes screenshots/images)
- **Grok Code Fast 1** - Fast code generation in workspace
- **Claude Sonnet 4.5** - High-quality code generation and analysis

## Supported Frameworks

1. **Next.js** - Full-stack web applications with SSR/SSG
2. **Vite + React** - Client-side SPAs and interactive tools
3. **Expo** - Cross-platform mobile apps (iOS, Android, Web)

## Key Features

### Core Platform
- Conversational AI development (chat to build apps)
- Visual click-to-edit interface
- Real-time live preview
- Voice input support
- Multi-chat sessions with branching
- AI Memory system (remembers project context)
- Slash commands (/help, /export, /settings, etc.)
- Codebase search & replace

### Integrations
- GitHub (repository management, PR creation)
- Vercel (one-click deployment)
- Netlify (static hosting)
- Supabase (database, auth, storage)
- Stripe (payments)

### Support System (Unique Features)
- AI chatbot on /support and /docs pages
- Persistent screen sharing (auto-captures every message)
- Multimodal support (images, documents, screenshots)
- Real-time documentation search (search_docs tool)
- Tawk.to live chat fallback

---

## Important Files & Architecture

### Main Chat/Workspace (User builds apps here)
```
app/api/chat-v2/route.ts          # Main AI chat API (10000+ lines, handles all workspace AI)
app/workspace/page.tsx             # Main workspace UI where users build apps
```

### Support & Documentation Chat
```
app/api/support-chat/route.ts      # Support chat API with search_docs tool
app/support/page.tsx               # Support page with FAQ + AI chatbot
app/docs/page.tsx                  # Documentation page with AI assistant
```

### Layout & Navigation
```
app/layout.tsx                     # Root layout (includes Tawk.to script)
components/navigation.tsx          # Main navigation bar
components/footer.tsx              # Site footer
```

### Documentation Data
```
public/docs.json                   # All documentation content (searchable by AI)
```

### Key Components
```
components/ai-elements/response.tsx  # Markdown rendering for AI responses (Streamdown)
components/ui/                       # shadcn/ui components
```

---

## API Routes Overview

| Route | Purpose |
|-------|---------|
| `/api/chat-v2` | Main workspace AI (code generation, file ops, tools) |
| `/api/support-chat` | Support/docs AI with search_docs tool |
| `/api/generate-*` | Various generation endpoints |

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **AI SDK:** Vercel AI SDK v5
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deployment:** Vercel

---

## Code Patterns

### AI SDK v5 Usage
```typescript
import { streamText, tool, stepCountIs } from 'ai'

const result = await streamText({
  model,
  system: systemPrompt,
  messages,
  tools: { ... },
  stopWhen: stepCountIs(3),  // NOT maxSteps (deprecated)
})

return result.toTextStreamResponse()
```

### Tool Definition
```typescript
tools: {
  search_docs: tool({
    description: 'Search documentation...',
    parameters: z.object({
      query: z.string(),
      maxResults: z.number().optional()
    }),
    execute: async ({ query, maxResults }) => {
      // Tool logic
    }
  })
}
```

### Multimodal Messages
```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

type ContentPart =
  | { type: 'text', text: string }
  | { type: 'image', image: string }  // base64 data URL
```

---

## Environment Variables

```
MISTRAL_API_KEY          # For Pixtral model
NEXT_PUBLIC_SUPABASE_URL # Supabase connection
SUPABASE_SERVICE_KEY     # Server-side Supabase
OPENAI_API_KEY           # OpenAI fallback
```

---

## Development Notes

1. **Don't add emojis** unless user explicitly requests
2. **Prefer editing existing files** over creating new ones
3. **Use AI SDK v5 patterns** (stopWhen, not maxSteps)
4. **Images in localStorage** are saved for display but stripped from AI context on old messages
5. **Tawk.to widget** is hidden on /support, /docs, and /workspace?projectId=* pages

---

## Quick Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run linter
```

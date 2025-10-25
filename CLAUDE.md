# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pipilot is an AI-powered app development platform that allows users to create web applications through natural language conversations. Built with Next.js 15, React 19, TypeScript, and Supabase.

## Development Commands

### Basic Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Important Notes
- Build errors and linting errors are ignored in production builds (see next.config.mjs)
- TypeScript strict mode is enabled

## Environment Variables

Required environment variables (create `.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
E2B_API_KEY=your_e2b_api_key
```

## Architecture Overview

### Core Architecture Patterns

**Client-Server Storage Separation:**
- Server-side: Uses InMemoryStorage (singleton pattern) for SSR compatibility
- Client-side: Uses IndexedDB for persistent project storage
- StorageManager (`lib/storage-manager.ts`) automatically detects environment and selects appropriate storage backend
- Projects are loaded client-side in workspace components, not during SSR

**AI Chat System (Chat V2):**
- Main endpoint: `app/api/chat-v2/route.ts`
- Uses Vercel AI SDK with `streamText` for streaming responses
- Session-based project storage in memory during AI operations
- File operations are executed through AI tools that manipulate the file tree
- Supports multiple AI providers (OpenAI, Mistral, Cohere, xAI, custom providers)

**File Management:**
- Project files stored in IndexedDB with structure: `{ path, name, content, language }`
- File tree operations managed by storage-manager
- Monaco Editor used for code editing with syntax highlighting
- File explorer provides VS Code-like interface

### Key Components

**Storage System (`lib/storage-manager.ts`):**
- Large file (~2400 lines) implementing dual storage backends
- Manages workspaces/projects, files, chat history, deployments
- Exports singleton `storageManager` instance
- Methods: `init()`, `createWorkspace()`, `updateFile()`, `getWorkspace()`, etc.

**AI Provider System (`lib/ai-providers.ts` & `lib/ai-models.ts`):**
- Supports multiple AI providers: OpenAI, Mistral, Cohere, xAI, custom a0.dev
- Default model: `grok-code-fast-1` (see DEFAULT_CHAT_MODEL)
- Models categorized by provider with descriptions and capabilities
- Provider initialization handles API keys and custom endpoints
- Special handling for codestral models via OpenAI-compatible endpoint

**Template Service (`lib/template-service.ts`):**
- Large file (~300KB) containing pre-built project templates
- Templates include: React Vite, Next.js, SaaS, Finance Tracker, E-commerce, etc.
- Each template has complete file structure with shadcn/ui components and custom hooks
- Templates are instantiated when creating new projects

**Workspace Layout (`components/workspace/workspace-layout.tsx`):**
- Main workspace UI component managing project state
- Integrates: Sidebar, FileExplorer, CodeEditor, ChatPanel, PreviewPanel
- Handles: File selection, model selection, AI mode selection, deployments
- Uses resizable panels for flexible layout

**Database Features:**
- Supabase integration for PostgreSQL databases
- SQL editor with syntax highlighting (`components/database/sql-editor.tsx`)
- Table management UI with CRUD operations
- Schema visualization and AI-powered schema generation
- API key management for database access

**Deployment System:**
- GitHub integration for code repository creation
- Vercel deployment support (OAuth + API integration)
- Netlify deployment support
- Deployment status tracking in workspace

### API Routes Structure

**Chat Endpoints:**
- `/api/chat-v2/route.ts` - Main chat endpoint with AI streaming (uses Chat V2 system)
- `/api/chat/route.ts` - Legacy chat endpoint
- `/api/chat-prompt-enhancement/route.ts` - Enhance user prompts before processing

**Database API:**
- `/api/database/[id]/route.ts` - Database CRUD operations
- `/api/database/[id]/tables/[tableId]/route.ts` - Table operations
- `/api/database/[id]/sql/execute/route.ts` - Execute SQL queries
- `/api/database/[id]/storage/upload/route.ts` - File uploads to database storage
- `/api/supabase/execute-sql/route.ts` - Direct SQL execution

**Deployment API:**
- `/api/github/create-repo/route.ts` - Create GitHub repositories
- `/api/deploy/vercel/route.ts` - Deploy to Vercel
- `/api/deploy/netlify/route.ts` - Deploy to Netlify
- `/api/auth/vercel/*` - Vercel OAuth flow
- `/api/auth/github/*` - GitHub OAuth flow

**Subscription/Billing:**
- `/api/stripe/create-checkout-session/route.ts` - Create Stripe checkout
- `/api/stripe/webhook/route.ts` - Handle Stripe webhooks
- `/api/user/subscription/route.ts` - User subscription management
- `/api/limits/*` - Usage limits and credit tracking

### Path Aliases

- `@/*` maps to root directory (configured in tsconfig.json)
- Example: `@/components/ui/button` resolves to `./components/ui/button`

## Important Technical Details

### AI Chat System (Chat V2)
- AI tools receive project context through session storage (in-memory Map)
- File operations during chat update both session storage and IndexedDB
- File paths must be relative to project root (e.g., `src/App.tsx`, not `/src/App.tsx`)
- Monaco Editor language modes map file extensions to syntax highlighting

### Database Integration
- Each project can have associated Supabase database
- Database schema stored in workspace metadata
- SQL queries executed server-side with validation
- Row Level Security (RLS) policies supported
- Real-time subscriptions available through Supabase client

### Preview System
- Uses E2B sandboxes for secure code execution
- Sandpack (CodeSandbox) integration for client-side previews
- Preview supports both React Vite and Next.js templates
- File changes trigger automatic preview updates

### Authentication Flow
- Supabase Auth for user authentication
- Server-side user validation in protected routes
- Middleware handles auth token refresh
- OAuth providers supported: GitHub, Vercel

### Workspace Cloud Sync
- Optional cloud backup to Supabase storage
- Automatic backup hooks available (`use-auto-cloud-backup`)
- Backup includes: files, chat history, project metadata
- Restore from cloud backup functionality

## Common Patterns

### Creating New Projects
1. User selects template (Vite, Next.js, or custom)
2. Template files loaded from template-service
3. Workspace created in IndexedDB via storageManager
4. Initial chat context populated with project structure
5. File explorer and editor initialized with template files

### AI Code Generation Flow
1. User sends prompt through ChatPanel
2. Request sent to `/api/chat-v2/route.ts`
3. AI model processes request with project context
4. AI tools called to create/update files
5. Files updated in both session storage and IndexedDB
6. File explorer and preview automatically update

### Deploying Projects
1. User authenticates with deployment platform (GitHub, Vercel, Netlify)
2. OAuth tokens stored in Supabase user metadata
3. Files prepared and formatted for deployment
4. API calls to create repository and trigger deployment
5. Deployment URL saved to workspace metadata

## UI Components

Built with shadcn/ui (Radix UI + Tailwind CSS):
- 25+ reusable components in `components/ui/`
- Custom components: Logo, ModelSelector, AiModeSelector
- Theme provider supports dark/light mode
- Responsive design with mobile support

## Custom Hooks

Located in `hooks/` directory:
- `use-mobile` - Mobile device detection
- `use-toast` - Toast notifications
- `use-credits` - Subscription and credit tracking
- `use-cloud-sync` - Cloud backup sync status
- `use-github-push` - GitHub integration helpers

## Testing & Debugging

- Debug tools available at `/debug-tools`
- Admin panel at `/admin` for user/system management
- Telemetry logging for AI requests (`/api/telemetry/route.ts`)
- Browser DevTools for IndexedDB inspection

## Known Limitations

- TypeScript and ESLint errors ignored during builds (intentional)
- Image optimization disabled in Next.js config
- IndexedDB not available during SSR (handled by InMemoryStorage fallback)
- Some template files exceed size limits and must be read with offset/limit parameters

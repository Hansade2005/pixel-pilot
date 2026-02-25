# PiPilot - Project Context & Change Log

> This file is read by Claude at session start. It provides current project state,
> recent changes, and feature inventory so new sessions have full context without
> re-exploring the codebase. **Update this file after every significant change.**

---

## Current State (as of 2026-02-25)

- **Production URL:** https://pipilot.dev
- **Framework:** Next.js 14+ (App Router) / Tailwind / shadcn/ui
- **Package Manager:** pnpm
- **Branch strategy:** main (production), feature branches as needed
- **AI SDK:** Vercel AI SDK v5 (use `stopWhen`, NOT `maxSteps`)

---

## Supabase Projects

| Role | Project ID | Purpose |
|------|-----------|---------|
| **Main App** | `lzuknbfbvpuscpammwzg` | Auth, billing, wallet, personas, snapshots, secrets, teams, organizations |
| **Agent Cloud** | `dlunpilhklsgvkegnnlp` | Agent sessions, messages, MCP connectors, hosted sites, site analytics |

Both accessible via the same Management API token (see `local-supabase-credentials.md`).

---

## Feature Inventory

### Workspace (Main Product) - `/workspace`
Users build fullstack apps via conversational AI.

| Feature | Key Files | Status |
|---------|----------|--------|
| AI Chat (code generation) | `app/api/chat-v2/route.ts`, `app/workspace/page.tsx` | Live |
| Visual click-to-edit | `app/api/visual-editor/` | Live |
| Live preview (iframe) | workspace page | Live |
| Voice input | workspace page | Live |
| Multi-chat sessions | workspace page | Live |
| AI Memory system | workspace page | Live |
| Slash commands | workspace page | Live |
| Codebase search & replace | workspace page | Live |
| GitHub sync | `app/api/github/` | Live |
| Vercel deploy | `app/api/vercel/`, `app/api/deploy/` | Live |
| Netlify deploy | `app/api/netlify/` | Live |
| Supabase integration | `app/api/supabase/`, `app/api/database/` | Live |
| Stripe integration | `app/api/stripe/` | Live |

### Agent Cloud - `/agent-cloud`
Cloud-based AI coding agent with E2B sandboxes.

| Feature | Key Files | Status |
|---------|----------|--------|
| Session management | `app/agent-cloud/`, `app/api/agent-cloud/` | Live |
| Message persistence | Supabase (dlunpilhklsgvkegnnlp) | Live |
| MCP connectors | `app/agent-cloud/settings/`, `app/api/agent-cloud/` | Live |
| Model selector | Session page input | Live |
| Tool output rendering (diffs, todos, syntax highlighting) | Session page | Live |
| Image attachments (IndexedDB) | Session page | Live |
| Bonsai AI provider (round-robin keys) | Agent cloud API | Live |
| Lazy-load messages | Session page | Live |

### Developer Power Tools (2026-02-25)

| Feature | UI Route | API Route | DB Table (Main) |
|---------|---------|-----------|-----------------|
| Usage Analytics | `/workspace/usage` | `/api/usage/` | `usage_logs`, `wallet` |
| AI Personas | `/workspace/personas` | `/api/personas/` | `ai_personas` |
| Project Snapshots | `/workspace/snapshots` | `/api/snapshots/` | `project_snapshots` |
| Project Health Score | `/workspace/health` | `/api/health-score/` | (computed on-demand) |
| Secrets Vault (AES-256-GCM) | `/workspace/secrets` | `/api/secrets/` | `project_secrets`, `secret_access_logs` |
| AI Code Review | `/workspace/code-reviews` | `/api/code-reviews/` | (computed on-demand) |
| Scheduled Tasks | `/workspace/scheduled-tasks` | `/api/scheduled-tasks/` | (planned: `scheduled_tasks`) |
| Project Showcase | `/workspace/showcase` | `/api/showcase/` | (planned: `showcase_projects`) |

### Marketing / Content Pages

| Page | Route | Notes |
|------|-------|-------|
| Landing page | `/` | Hero, chat input, projects, templates, trust layer |
| Pricing | `/pricing` | Free / Creator $25 / Collaborate $75 / Scale $150 |
| Docs | `/docs` | AI-searchable docs with search_docs tool |
| Support | `/support` | FAQ + AI chatbot with screen sharing |
| Blog | `/blog` | Static blog posts |
| Features | `/features` | Feature showcase pages |
| About | `/about` | Company info |
| Showcase | `/showcase` | Public project gallery |
| Templates | `/templates` (section on landing) | App templates |

---

## Recent Changes (Chronological)

### 2026-02-25
- **Developer Power Tools launch** - 8 features in one sprint:
  - Usage Analytics dashboard with real-time credit tracking
  - AI Personas (custom instruction sets per project)
  - Project Snapshots with one-click rollback
  - Project Health Score (A-F grading, 5 categories)
  - Secrets Vault (AES-256-GCM encryption, Vercel sync, audit trail)
  - AI Code Review (security, performance, maintainability analysis)
  - Scheduled Tasks (cron-based agent automation)
  - Project Showcase (community gallery with likes/views)
- Added documentation, blog post, and features page for all above
- Custom HTTP streamable MCP servers for agent cloud
- Added .mcp.json to .gitignore

### 2026-02-22
- Removed meta/llama-4-scout model
- Refactored Bonsai models: removed from workspace, kept only in agent-cloud
- Added openai/gpt-oss-120b, zai/glm-4.6 models

### 2026-02-21
- Removed LLM Gateway provider and broken xai/glm-4.7 model
- Added LLM Gateway provider with zai/glm-4.7-flash (then removed)

### 2026-02-20
- **Agent Cloud UI overhaul:**
  - Redesigned with clean branded design
  - Model selector in session input
  - Plus context menu, attachment pills, Playwright toggle
  - MCP & Connectors submenu on /new and session pages
  - Fixed mobile: sidebar, header, fixed bottom input
  - Lazy-load session messages
  - Cross-device session load fix
  - Image storage moved from Supabase to IndexedDB
  - User message bubbles: orange bg, right-aligned
  - Tool output: git-style diffs, syntax highlighting, TodoWrite inline
  - Message truncation (308 chars / 54 words)
- **Bonsai AI provider:** Added with 4 models, round-robin key rotation, Anthropic-compatible API
- **Landing page:** Universe starfield, floating rocks, particle background, arc effects, trust layer, logo bar

### 2026-02-19
- Playwright browser testing setup (e2e/browse.spec.ts)
- Floating particle background with orange brand theme
- Homepage restructure: Projects section after E2B badge, trust layer, how-it-works
- Footer badges fix (marquee own row)

---

## Key Architecture Decisions

1. **Two Supabase projects** - Main app (auth/billing) vs Agent Cloud (sessions/messages) for isolation
2. **No FK constraints in agent cloud** - Soft references for E2B sandbox lifecycle flexibility
3. **RLS off on agent_cloud_* tables** - Access controlled at API layer (service role)
4. **Token-based billing** - Credits consumed per AI request, not flat message limits
5. **E2B sandboxes** - Agent Cloud runs code in isolated cloud sandboxes
6. **Bonsai provider** - Round-robin API key rotation for agent cloud models
7. **IndexedDB for images** - Agent cloud images stored client-side, not in Supabase
8. **Orange accent brand** - Consistent theme defined in `.claude/rules/brand-theme.md`

---

## Pricing Tiers

| Plan | Monthly | Credits | Requests |
|------|---------|---------|----------|
| Free | $0 | 150 | 20/mo |
| Creator | $25 CAD | 1,000 | 250/mo |
| Collaborate | $75 CAD | 2,500 | 600/mo |
| Scale | $150 CAD | 5,000 | 2,000/mo |

Credit top-ups: $0.01/credit (paid plans only).

---

## AI Models in Use

| Context | Models |
|---------|--------|
| Workspace (main) | Grok Code Fast 1, Claude Sonnet 4.5, Gemini 2.5 Flash, Devstral 2 |
| Agent Cloud | Bonsai models (round-robin), all workspace models |
| Support chat | Mistral Pixtral (vision-enabled) |

---

## Important File Paths

```
app/api/chat-v2/route.ts           # Main AI chat API (~10k lines)
app/workspace/page.tsx              # Main workspace UI
app/agent-cloud/                    # Agent Cloud pages
app/api/agent-cloud/                # Agent Cloud API routes
lib/stripe-config.ts                # Pricing/plan configs
lib/supabase/                       # Supabase client setup
components/navigation.tsx           # Main nav bar
components/footer.tsx               # Site footer
public/docs.json                    # Searchable documentation data
.claude/rules/brand-theme.md        # Orange accent color system
.claude/rules/playwright-browser-testing.md  # Browser testing setup
.claude/rules/local-supabase-credentials.md  # DB access (gitignored)
```

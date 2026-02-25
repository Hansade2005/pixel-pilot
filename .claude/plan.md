# PiPilot - Active & Completed Plans

> This file tracks in-progress and completed implementation plans.
> If a session is interrupted, the next session picks up from where things left off
> by reading this file. **Update this file as you start, progress through, and complete plans.**

---

## How to Use This File

1. **Before starting work:** Check for any `IN PROGRESS` plans below - resume from the last checked item
2. **When starting a new plan:** Add it under "Active Plans" with status `IN PROGRESS`
3. **As you complete steps:** Mark each step with `[x]` and note any deviations
4. **When a plan is done:** Move it to "Completed Plans" with the completion date
5. **If blocked:** Note the blocker under the relevant step so the next session knows

---

## Active Plans

_No active plans at this time._

<!--
Template for new plans:

### [Plan Name]
**Status:** IN PROGRESS
**Started:** YYYY-MM-DD
**Branch:** branch-name
**Context:** Brief description of what triggered this plan

**Steps:**
- [ ] Step 1 description
  - Notes/blockers: ...
- [ ] Step 2 description
- [ ] Step 3 description

**Files Modified:**
- `path/to/file.ts` - what changed

**Decisions Made:**
- Decision 1: why we chose this approach
-->

---

## Completed Plans

### Developer Power Tools Launch
**Status:** COMPLETED
**Completed:** 2026-02-25
**Branch:** main
**Context:** Ship 8 developer power tools to differentiate PiPilot from competitors

**Steps:**
- [x] Usage Analytics - dashboard with credit tracking, model usage breakdown
- [x] AI Personas - custom instruction sets per project, CRUD API + UI
- [x] Project Snapshots - one-click backup/restore, API + UI
- [x] Project Health Score - 5-category A-F grading, API + UI
- [x] Wire up navigation for all 4 features in both sidebar variants
- [x] Secrets Vault - AES-256-GCM encryption, Vercel sync, audit trail, API + UI
- [x] AI Code Review - static analysis (security, performance, maintainability), API + UI
- [x] Scheduled Tasks - cron-based automation, API + UI
- [x] Project Showcase - community gallery with likes/views, API + UI
- [x] Documentation: docs.json, blog post, features page update

**Files Modified:**
- `app/workspace/usage/`, `app/api/usage/` - Analytics
- `app/workspace/personas/`, `app/api/personas/` - Personas
- `app/workspace/snapshots/`, `app/api/snapshots/` - Snapshots
- `app/workspace/health/`, `app/api/health-score/` - Health Score
- `app/workspace/secrets/`, `app/api/secrets/` - Secrets Vault
- `app/workspace/code-reviews/`, `app/api/code-reviews/` - Code Review
- `app/workspace/scheduled-tasks/`, `app/api/scheduled-tasks/` - Scheduled Tasks
- `app/workspace/showcase/`, `app/api/showcase/` - Showcase
- `components/navigation.tsx` - Sidebar navigation wiring
- `public/docs.json` - Documentation content
- `app/blog/` - Blog post
- `app/features/` - Features page

---

### Agent Cloud UI Overhaul
**Status:** COMPLETED
**Completed:** 2026-02-20
**Branch:** main
**Context:** Complete redesign of agent cloud interface with branded theme

**Steps:**
- [x] Redesign session UI with clean dark theme + orange accents
- [x] Add model selector to session input
- [x] Plus context menu with attachment pills and Playwright toggle
- [x] MCP & Connectors submenu on /new and session pages
- [x] Tool output rendering: git-style diffs, syntax highlighting, TodoWrite inline
- [x] Message truncation (308 chars / 54 words with show more)
- [x] Mobile fixes: fixed bottom input, sidebar, header
- [x] Lazy-load session messages
- [x] Cross-device session load fix
- [x] Move image storage from Supabase to IndexedDB
- [x] User message bubbles: orange bg, right-aligned

---

### Bonsai AI Provider Integration
**Status:** COMPLETED
**Completed:** 2026-02-20
**Branch:** main
**Context:** Replace Vercel AI Gateway with Bonsai for agent cloud

**Steps:**
- [x] Add Bonsai provider with 4 models via Anthropic-compatible API
- [x] Fix base URL (/v1 path) and routing (prevent SDK redirect to Vercel Gateway)
- [x] Strip routing metadata from model responses
- [x] Update model selector UI
- [x] Add round-robin API key rotation
- [x] Refactor: keep Bonsai only in agent-cloud, remove from workspace

---

### Custom MCP Servers
**Status:** COMPLETED
**Completed:** 2026-02-25
**Branch:** main
**Context:** Allow users to add custom HTTP streamable MCP servers to agent cloud

**Steps:**
- [x] Implement custom HTTP streamable MCP server support
- [x] Add .mcp.json to .gitignore

---

### Agent Cloud Message Store Documentation
**Status:** COMPLETED
**Completed:** 2026-02-25
**Branch:** claude/fix-dropdown-z-index-Qji0z
**Context:** Document second Supabase project (dlunpilhklsgvkegnnlp) used for agent cloud

**Steps:**
- [x] Query all tables, schemas, indexes, RLS policies, functions, storage buckets
- [x] Document full specification in local-supabase-credentials.md
- [x] Map project relationship (main vs agent cloud)

**Findings:**
- 7 tables, 9 functions, 4 storage buckets
- No FK constraints (intentional for E2B flexibility)
- RLS off on agent_cloud_* tables (API-layer access control)
- Legacy `client_intake` table from Pixelways (unused)
- `save_chat_message`/`get_chat_history` functions reference old `chat_messages` table schema

---

## Parking Lot (Future Ideas / Unplanned)

- Agent Cloud: scheduled tasks actually executing AI agents via E2B sandboxes on cron
- Agent Cloud: real-time collaboration (shared sessions)
- Team features: shared credit pools, role-based access
- Showcase: community templates marketplace
- Custom domains for hosted sites
- SSO integration for Scale tier
- `save_chat_message`/`get_chat_history` functions in agent cloud DB may need updating to reference `agent_cloud_messages` instead of old `chat_messages` table

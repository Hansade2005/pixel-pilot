# 🎯 Team Workspaces Integration Plan - Kill Lovable Strategy

**Objective:** Seamlessly integrate team collaboration WITHOUT breaking existing features

**Strategy:** Smart Abstraction Layer - Make storage-manager intelligent enough to handle both personal and team workspaces transparently

---

## 🚫 What We're NOT Doing

❌ **DO NOT clone chat-panel-v2** - Keep one chat interface
❌ **DO NOT clone chat-v2 route** - Keep one API route
❌ **DO NOT use WebSockets** - Use Supabase Realtime instead
❌ **DO NOT break existing features** - Everything must still work

---

## ✅ What We're Doing

### Core Strategy: **Transparent Storage Abstraction**

The chat panel, file explorer, and AI tools will continue to use `storageManager` exactly as they do now. The magic happens inside storageManager - it detects the workspace type and routes operations accordingly.

```typescript
// Chat panel code STAYS THE SAME
const file = await storageManager.updateFile(workspaceId, fileId, { content: newContent })

// Storage manager handles routing internally:
if (isTeamWorkspace) {
  → API call to /api/teams/workspaces/[id]/files
  → Update team_workspaces.files JSONB
  → Broadcast via Supabase Realtime
} else {
  → Update IndexedDB (existing logic)
  → Cloud sync to user_backups
}
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PiPilot Chat UI                       │
│              (chat-panel-v2.tsx - NO CHANGES)            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ storageManager.updateFile(...)
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Storage Manager (ENHANCED)                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Detect workspace type                        │   │
│  │    - Query workspace metadata                   │   │
│  │    - Check if organizationId exists             │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│      ┌─────────────▼──────────────┐                    │
│      │ Is Team Workspace?         │                    │
│      └──┬─────────────────────┬───┘                    │
│         │ YES                 │ NO                      │
│         │                     │                         │
│  ┌──────▼───────┐      ┌─────▼──────┐                 │
│  │ Team Route   │      │ Personal   │                 │
│  │              │      │ Route      │                 │
│  │ API Call to  │      │ IndexedDB  │                 │
│  │ Supabase     │      │ (existing) │                 │
│  └──────────────┘      └────────────┘                 │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Storage Manager Enhancement (Day 1)

#### 1.1 Add Workspace Type Detection

**File:** `lib/storage-manager.ts`

```typescript
export interface Workspace {
  id: string
  name: string
  userId: string
  // NEW FIELDS
  organizationId?: string | null  // If set, it's a team workspace
  isTeamWorkspace?: boolean       // Helper flag
  teamWorkspaceId?: string        // Reference to team_workspaces.id
  // ... existing fields
}

class UniversalStorageManager {
  // NEW: Cache for workspace types (avoid repeated lookups)
  private workspaceTypeCache = new Map<string, 'personal' | 'team'>()

  /**
   * Detect if workspace is personal or team
   */
  async getWorkspaceType(workspaceId: string): Promise<'personal' | 'team'> {
    // Check cache first
    if (this.workspaceTypeCache.has(workspaceId)) {
      return this.workspaceTypeCache.get(workspaceId)!
    }

    // Try to get from IndexedDB first (personal workspaces)
    const personal = await this.getWorkspace(workspaceId)
    if (personal && !personal.organizationId) {
      this.workspaceTypeCache.set(workspaceId, 'personal')
      return 'personal'
    }

    // Check if it's a team workspace in Supabase
    const response = await fetch(`/api/teams/workspaces/${workspaceId}/type`)
    if (response.ok) {
      const { isTeam } = await response.json()
      const type = isTeam ? 'team' : 'personal'
      this.workspaceTypeCache.set(workspaceId, type)
      return type
    }

    // Default to personal
    return 'personal'
  }

  /**
   * Clear workspace type cache (call when switching workspaces)
   */
  clearWorkspaceTypeCache() {
    this.workspaceTypeCache.clear()
  }
}
```

#### 1.2 Enhance File CRUD Methods

```typescript
class UniversalStorageManager {
  /**
   * Update file - works for both personal and team workspaces
   */
  async updateFile(workspaceId: string, fileId: string, updates: Partial<File>): Promise<File | null> {
    const type = await this.getWorkspaceType(workspaceId)

    if (type === 'team') {
      // Route to team workspace API
      return await this.updateTeamWorkspaceFile(workspaceId, fileId, updates)
    } else {
      // Use existing IndexedDB logic
      return await this.updatePersonalFile(workspaceId, fileId, updates)
    }
  }

  /**
   * Create file - works for both types
   */
  async createFile(file: Omit<File, 'id' | 'createdAt' | 'updatedAt'>): Promise<File> {
    const type = await this.getWorkspaceType(file.workspaceId)

    if (type === 'team') {
      return await this.createTeamWorkspaceFile(file)
    } else {
      return await this.createPersonalFile(file)
    }
  }

  /**
   * Get files - works for both types
   */
  async getFiles(workspaceId: string): Promise<File[]> {
    const type = await this.getWorkspaceType(workspaceId)

    if (type === 'team') {
      return await this.getTeamWorkspaceFiles(workspaceId)
    } else {
      return await this.getPersonalFiles(workspaceId)
    }
  }

  /**
   * Delete file - works for both types
   */
  async deleteFile(workspaceId: string, fileId: string): Promise<boolean> {
    const type = await this.getWorkspaceType(workspaceId)

    if (type === 'team') {
      return await this.deleteTeamWorkspaceFile(workspaceId, fileId)
    } else {
      return await this.deletePersonalFile(workspaceId, fileId)
    }
  }

  // NEW: Team workspace file operations
  private async updateTeamWorkspaceFile(
    workspaceId: string,
    fileId: string,
    updates: Partial<File>
  ): Promise<File | null> {
    const response = await fetch(`/api/teams/workspaces/${workspaceId}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) return null
    return await response.json()
  }

  private async createTeamWorkspaceFile(file: Omit<File, 'id' | 'createdAt' | 'updatedAt'>): Promise<File> {
    const response = await fetch(`/api/teams/workspaces/${file.workspaceId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file)
    })

    if (!response.ok) throw new Error('Failed to create team file')
    return await response.json()
  }

  private async getTeamWorkspaceFiles(workspaceId: string): Promise<File[]> {
    const response = await fetch(`/api/teams/workspaces/${workspaceId}/files`)
    if (!response.ok) return []
    const { files } = await response.json()
    return files
  }

  private async deleteTeamWorkspaceFile(workspaceId: string, fileId: string): Promise<boolean> {
    const response = await fetch(`/api/teams/workspaces/${workspaceId}/files/${fileId}`, {
      method: 'DELETE'
    })
    return response.ok
  }
}
```

---

### Phase 2: Team Workspace API Routes (Day 1-2)

#### 2.1 File Operations API

**File:** `app/api/teams/workspaces/[workspaceId]/files/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams/workspaces/[workspaceId]/files
// List all files in team workspace
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get workspace and verify access
  const { data: workspace, error } = await supabase
    .from('team_workspaces')
    .select('*, organization_id')
    .eq('id', params.workspaceId)
    .single()

  if (error || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Check team membership (RLS will handle this, but we verify explicitly)
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('organization_id', workspace.organization_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    files: workspace.files || []
  })
}

// POST /api/teams/workspaces/[workspaceId]/files
// Create new file in team workspace
export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fileData = await request.json()

  // Get current workspace
  const { data: workspace } = await supabase
    .from('team_workspaces')
    .select('files, organization_id')
    .eq('id', params.workspaceId)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Create new file object
  const newFile = {
    id: crypto.randomUUID(),
    path: fileData.path,
    name: fileData.name,
    content: fileData.content,
    fileType: fileData.fileType,
    size: fileData.size || 0,
    isDirectory: fileData.isDirectory || false,
    lastEditedBy: user.id,
    lastEditedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }

  // Append to files array
  const updatedFiles = [...(workspace.files || []), newFile]

  // Update workspace
  const { error } = await supabase
    .from('team_workspaces')
    .update({
      files: updatedFiles,
      last_edited_by: user.id,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', params.workspaceId)

  if (error) {
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }

  // Log activity
  await supabase.from('team_activity').insert({
    organization_id: workspace.organization_id,
    workspace_id: params.workspaceId,
    action: 'file_created',
    actor_id: user.id,
    metadata: {
      file_path: newFile.path,
      file_name: newFile.name
    }
  })

  return NextResponse.json({
    success: true,
    file: newFile
  })
}
```

**File:** `app/api/teams/workspaces/[workspaceId]/files/[fileId]/route.ts`

```typescript
// PATCH /api/teams/workspaces/[workspaceId]/files/[fileId]
// Update file content
export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; fileId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  // Get workspace
  const { data: workspace } = await supabase
    .from('team_workspaces')
    .select('files, organization_id')
    .eq('id', params.workspaceId)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Find and update file in array
  const files = workspace.files || []
  const fileIndex = files.findIndex((f: any) => f.id === params.fileId)

  if (fileIndex === -1) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Update file
  files[fileIndex] = {
    ...files[fileIndex],
    ...updates,
    lastEditedBy: user.id,
    lastEditedAt: new Date().toISOString()
  }

  // Save back to database
  const { error } = await supabase
    .from('team_workspaces')
    .update({
      files: files,
      last_edited_by: user.id,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', params.workspaceId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
  }

  // Log activity
  await supabase.from('team_activity').insert({
    organization_id: workspace.organization_id,
    workspace_id: params.workspaceId,
    action: 'file_updated',
    actor_id: user.id,
    metadata: {
      file_id: params.fileId,
      file_path: files[fileIndex].path
    }
  })

  return NextResponse.json({
    success: true,
    file: files[fileIndex]
  })
}

// DELETE /api/teams/workspaces/[workspaceId]/files/[fileId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; fileId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get workspace
  const { data: workspace } = await supabase
    .from('team_workspaces')
    .select('files, organization_id')
    .eq('id', params.workspaceId)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Filter out the file
  const files = (workspace.files || []).filter((f: any) => f.id !== params.fileId)

  // Save back
  const { error } = await supabase
    .from('team_workspaces')
    .update({
      files: files,
      last_edited_by: user.id,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', params.workspaceId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

#### 2.2 Workspace Type Detection API

**File:** `app/api/teams/workspaces/[workspaceId]/type/route.ts`

```typescript
// GET /api/teams/workspaces/[workspaceId]/type
// Quick check if workspace is team or personal
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = createClient()

  const { data } = await supabase
    .from('team_workspaces')
    .select('id')
    .eq('id', params.workspaceId)
    .single()

  return NextResponse.json({
    isTeam: !!data,
    workspaceId: params.workspaceId
  })
}
```

---

### Phase 3: Supabase Realtime Integration (Day 2-3)

#### 3.1 Create Realtime Hook

**File:** `hooks/use-team-workspace-sync.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface TeamWorkspaceFile {
  id: string
  path: string
  name: string
  content: string
  lastEditedBy: string
  lastEditedAt: string
}

export function useTeamWorkspaceSync(workspaceId: string | null, isTeamWorkspace: boolean) {
  const [files, setFiles] = useState<TeamWorkspaceFile[]>([])
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!workspaceId || !isTeamWorkspace) return

    // Subscribe to workspace changes
    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_workspaces',
          filter: `id=eq.${workspaceId}`
        },
        async (payload) => {
          console.log('Team workspace updated:', payload)

          // Get user who made the change
          const { data: { user } } = await supabase.auth.getUser()
          const wasEditedByMe = payload.new.last_edited_by === user?.id

          if (!wasEditedByMe) {
            // Another team member made changes
            setFiles(payload.new.files || [])
            setLastEditedBy(payload.new.last_edited_by)

            // Show toast notification
            toast({
              title: 'Workspace Updated',
              description: 'A team member made changes to the workspace',
              duration: 3000
            })

            // Trigger a refresh in the UI
            window.dispatchEvent(new CustomEvent('team-workspace-updated', {
              detail: {
                workspaceId,
                files: payload.new.files,
                lastEditedBy: payload.new.last_edited_by
              }
            }))
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [workspaceId, isTeamWorkspace, toast])

  return {
    files,
    lastEditedBy,
    // Expose method to manually refresh
    refresh: async () => {
      if (!workspaceId) return

      const { data } = await supabase
        .from('team_workspaces')
        .select('files')
        .eq('id', workspaceId)
        .single()

      if (data) {
        setFiles(data.files || [])
      }
    }
  }
}
```

#### 3.2 Integrate into Chat Panel

**File:** `components/workspace/chat-panel-v2.tsx` (MINIMAL CHANGES)

```typescript
// Add at top with other imports
import { useTeamWorkspaceSync } from '@/hooks/use-team-workspace-sync'

// Inside ChatPanel component, add:
const [isTeamWorkspace, setIsTeamWorkspace] = useState(false)
const [workspaceType, setWorkspaceType] = useState<'personal' | 'team'>('personal')

// Add realtime sync hook
const { refresh: refreshTeamWorkspace } = useTeamWorkspaceSync(
  currentWorkspaceId,
  isTeamWorkspace
)

// Listen for team workspace updates
useEffect(() => {
  const handleTeamWorkspaceUpdate = (event: CustomEvent) => {
    console.log('Team workspace updated, refreshing file list...')
    // Refresh file explorer
    loadFiles()
  }

  window.addEventListener('team-workspace-updated', handleTeamWorkspaceUpdate as EventListener)

  return () => {
    window.removeEventListener('team-workspace-updated', handleTeamWorkspaceUpdate as EventListener)
  }
}, [currentWorkspaceId])

// Detect workspace type when workspace changes
useEffect(() => {
  if (!currentWorkspaceId) return

  const detectWorkspaceType = async () => {
    const type = await storageManager.getWorkspaceType(currentWorkspaceId)
    setWorkspaceType(type)
    setIsTeamWorkspace(type === 'team')
  }

  detectWorkspaceType()
}, [currentWorkspaceId])
```

---

### Phase 4: Chat Route Integration (Day 3)

**File:** `app/api/chat-v2/route.ts` (NO MAJOR CHANGES NEEDED)

The chat route already uses `storageManager` for all file operations. Since we're enhancing storageManager to handle both types, the chat route **just works**!

```typescript
// Existing code in chat-v2/route.ts
const file = await storageManager.updateFile(workspaceId, fileId, {
  content: newContent
})

// This will automatically:
// - Detect if it's a team workspace
// - Route to API if team
// - Route to IndexedDB if personal
// - NO CODE CHANGES NEEDED! ✨
```

---

### Phase 5: File Explorer Integration (Day 3)

The file explorer already uses `storageManager.getFiles()`. Since we're enhancing that method, it will automatically work with team workspaces!

**Optional Enhancement:** Add visual indicator for team files

```typescript
// In file explorer component
<div className="flex items-center gap-2">
  <FileIcon />
  <span>{file.name}</span>
  {isTeamWorkspace && (
    <Badge variant="secondary" className="text-xs">
      <Users className="size-3 mr-1" />
      Team
    </Badge>
  )}
</div>
```

---

## 📋 Complete Implementation Checklist

### Day 1: Core Infrastructure
- [ ] Enhance `storage-manager.ts` with workspace type detection
- [ ] Add `getWorkspaceType()` method
- [ ] Add workspace type cache
- [ ] Implement team file CRUD methods
- [ ] Create `/api/teams/workspaces/[id]/files/route.ts`
- [ ] Create `/api/teams/workspaces/[id]/files/[fileId]/route.ts`
- [ ] Create `/api/teams/workspaces/[id]/type/route.ts`

### Day 2: Realtime Sync
- [ ] Create `use-team-workspace-sync.ts` hook
- [ ] Integrate Supabase Realtime subscriptions
- [ ] Add custom event dispatch for UI updates
- [ ] Add workspace type detection to chat-panel-v2
- [ ] Wire up realtime update listener
- [ ] Test with 2 users editing simultaneously

### Day 3: UI Integration
- [ ] Add visual indicators for team workspaces
- [ ] Add "Convert to Team Workspace" feature
- [ ] Add team member presence indicators
- [ ] Show "who's editing" in file explorer
- [ ] Add conflict warnings (if file edited by multiple users)

### Day 4: Testing & Polish
- [ ] Test all file operations (create, read, update, delete)
- [ ] Test with 3+ team members
- [ ] Test realtime sync performance
- [ ] Test switching between personal and team workspaces
- [ ] Test file explorer with mixed workspace types
- [ ] Test AI chat with team workspaces

---

## 🎯 How Everything Works Together

### Scenario 1: User Creates File in Team Workspace

```
1. User types in chat: "Create App.tsx with a hello world component"

2. AI generates response with <write_to_file> tool

3. chat-v2/route.ts calls:
   await storageManager.createFile({
     workspaceId: 'team-workspace-123',
     path: '/src/App.tsx',
     content: '...'
   })

4. storageManager detects workspace type:
   - Calls getWorkspaceType('team-workspace-123')
   - Returns 'team'

5. storageManager routes to createTeamWorkspaceFile():
   - POST /api/teams/workspaces/team-workspace-123/files
   - File saved to team_workspaces.files JSONB

6. Supabase Realtime broadcasts UPDATE event

7. Other team members receive notification:
   - Toast: "John created App.tsx"
   - File explorer auto-refreshes
   - New file appears instantly

8. Activity logged to team_activity table
```

### Scenario 2: User Edits File in Personal Workspace

```
1. User edits file in file explorer

2. File explorer calls:
   await storageManager.updateFile(workspaceId, fileId, { content })

3. storageManager detects workspace type:
   - Calls getWorkspaceType('personal-workspace-456')
   - Returns 'personal'

4. storageManager routes to updatePersonalFile():
   - Updates IndexedDB directly (existing logic)
   - Storage event fires

5. Auto-sync service picks up change:
   - After 5-second throttle
   - Uploads backup to user_backups table

6. No broadcast to others (personal workspace)
```

---

## 🚀 Competitive Advantages Over Lovable

### What We Have That Lovable Doesn't:

1. **Hybrid Storage** - Personal workspaces work offline, team workspaces sync in real-time
2. **10+ AI Models** - Users can switch between models mid-conversation
3. **Advanced Database Manager** - Visual SQL editor with migration support
4. **Voice Input** - Speak to generate code
5. **URL Cloning** - Clone any website instantly
6. **Screenshot-to-Code** - Already shipped!
7. **Transparent Collaboration** - Same chat interface for personal and team

### Timeline to Ship:

- **Week 1 (Jan 26-27):** Core team workspace functionality
- **Week 2 (Feb 3-4):** Realtime sync + UI polish
- **Week 3 (Feb 10-11):** Advanced features (presence, conflicts, history)
- **Week 4 (Feb 17-18):** Launch! 🚀

---

## 📊 Performance Metrics

### Personal Workspace (Unchanged)
- File read: ~1-5ms (IndexedDB)
- File write: ~5-10ms (IndexedDB)
- Offline capable: ✅

### Team Workspace (New)
- File read: ~50-200ms (Supabase API)
- File write: ~100-300ms (Supabase API + activity log)
- Realtime sync: ~50-100ms (Supabase Realtime)
- Offline capable: ❌ (future: queue changes)

---

## 🎓 Developer Guide

### For Chat Panel Developers:
**NO CHANGES NEEDED** - Continue using storageManager as before

### For Storage Manager Developers:
```typescript
// Always use getWorkspaceType() before operations
const type = await this.getWorkspaceType(workspaceId)

if (type === 'team') {
  // Route to API
} else {
  // Route to IndexedDB
}
```

### For API Route Developers:
```typescript
// All team workspace APIs follow this pattern:
1. Authenticate user
2. Verify team membership
3. Perform operation on team_workspaces table
4. Log to team_activity
5. Return success
```

---

## 🎯 Next Action

**START WITH:** Enhancing storage-manager.ts

This is the foundation. Once storage-manager transparently handles both types, everything else falls into place naturally.

**Command to execute:**
```bash
# Create API routes structure
mkdir -p app/api/teams/workspaces/[workspaceId]/files/[fileId]
mkdir -p app/api/teams/workspaces/[workspaceId]/type

# Create hooks
mkdir -p hooks

# Ready to code!
```

---

**Author:** Claude Code
**Date:** January 25, 2025
**Status:** Ready to implement
**Goal:** Kill Lovable 🎯

# 🏗️ Team Workspaces Storage Architecture

## 📊 Current Storage System (Personal Workspaces)

### Client-Side (IndexedDB)
```
User's Browser IndexedDB
├── workspaces (personal projects)
├── files (all project files)
├── chat_sessions
├── messages
├── checkpoints
├── conversation_memory
├── deployments
└── tool_executions
```

### Cloud Sync (Supabase)
```
user_backups table:
{
  user_id: UUID,
  backup_data: {
    workspaces: [...],
    files: [...],
    chat_sessions: [...],
    messages: [...],
    // ... entire IndexedDB exported as JSON
  },
  created_at: timestamp
}
```

**How It Works:**
1. User edits files → Saved to IndexedDB
2. Storage event fires → Auto-sync service listens
3. After 2-second buffer → `uploadBackupToCloud()` exports ALL IndexedDB data
4. Entire backup saved to `user_backups.backup_data` (JSONB column)
5. Each user has isolated backup (no collaboration)

---

## 🚀 Team Workspaces Architecture (NEW)

### The Problem
- Current system: Each user's data is isolated in their own IndexedDB + backup
- Team collaboration needs: Multiple users working on the SAME workspace
- Challenge: How to enable real-time collaboration while keeping personal workspaces fast

### The Solution: Hybrid Storage Strategy

#### 🎯 Workspace Types

**1. Personal Workspace (Existing - No Changes)**
```typescript
interface PersonalWorkspace extends Workspace {
  userId: string          // Single owner
  isTeamWorkspace: false  // Flag to differentiate
  // ... stored in IndexedDB + backed up to user_backups
}
```

**2. Team Workspace (NEW)**
```typescript
interface TeamWorkspace {
  id: UUID
  organization_id: UUID      // Which team owns this
  name: string
  created_by: UUID           // Creator
  visibility: 'private' | 'team' | 'public'

  // Files stored as JSONB in database (NOT IndexedDB)
  files: Array<{
    path: string
    content: string
    name: string
    fileType: string
    size: number
    isDirectory: boolean
    lastEditedBy: UUID
    lastEditedAt: timestamp
  }>

  // Activity tracking
  last_edited_by: UUID
  last_edited_at: timestamp
}
```

---

## 🔄 Data Flow: Personal vs Team Workspaces

### Personal Workspace Flow (Unchanged)
```
User Action
    ↓
IndexedDB (instant local save)
    ↓
Storage Event Fires
    ↓
Auto-Sync Service (2-second buffer)
    ↓
Upload to user_backups table
    ↓
Cloud backup complete
```
**Pros:** Fast, offline-capable, user owns data
**Cons:** No collaboration

---

### Team Workspace Flow (NEW)
```
User Action (edit file in team workspace)
    ↓
POST /api/teams/[orgId]/workspaces/[workspaceId]/files
    ↓
Backend updates team_workspaces.files JSONB
    ↓
Log activity to team_activity table
    ↓
Broadcast change via WebSocket (Phase 5)
    ↓
Other team members receive update
    ↓
UI refreshes with new content
```
**Pros:** Real-time collaboration, centralized source of truth
**Cons:** Requires internet connection

---

## 📁 File Storage Strategy

### Personal Workspace Files
```sql
-- Stored in user_backups.backup_data
{
  "files": [
    {
      "id": "file-1",
      "workspaceId": "workspace-personal-123",
      "path": "/src/App.tsx",
      "content": "...",
      "size": 1234
    }
  ]
}
```
- **Location:** IndexedDB → Backed up to `user_backups` table
- **Access:** Single user only
- **Sync:** Auto-sync every 5 seconds (throttled)

### Team Workspace Files
```sql
-- Stored in team_workspaces.files column
UPDATE team_workspaces
SET files = jsonb_set(
  files,
  '{0}',
  '{
    "path": "/src/App.tsx",
    "content": "...",
    "lastEditedBy": "user-uuid",
    "lastEditedAt": "2025-01-25T10:30:00Z"
  }'::jsonb
)
WHERE id = 'workspace-team-456';
```
- **Location:** Directly in `team_workspaces.files` (JSONB column)
- **Access:** All team members (based on role permissions)
- **Sync:** Instant (database is source of truth)

---

## 🔀 Migration Strategy: Personal → Team

### Converting Personal Workspace to Team Workspace

```typescript
async function convertToTeamWorkspace(
  personalWorkspaceId: string,
  organizationId: string,
  userId: string
): Promise<string> {
  // 1. Export files from IndexedDB
  const files = await storageManager.getFiles(personalWorkspaceId)

  // 2. Create team workspace in database
  const { data: teamWorkspace } = await supabase
    .from('team_workspaces')
    .insert({
      organization_id: organizationId,
      name: workspace.name,
      created_by: userId,
      visibility: 'team',
      files: files.map(f => ({
        path: f.path,
        content: f.content,
        name: f.name,
        fileType: f.fileType,
        size: f.size,
        isDirectory: f.isDirectory,
        lastEditedBy: userId,
        lastEditedAt: new Date().toISOString()
      }))
    })
    .select()
    .single()

  // 3. Delete from IndexedDB (optional - or keep as copy)
  await storageManager.deleteWorkspace(personalWorkspaceId)

  // 4. Update user_backups to remove converted workspace
  await uploadBackupToCloud(userId)

  return teamWorkspace.id
}
```

---

## 🔄 Real-Time Sync Strategy

### Phase 1: Polling (Simple - Implement First)
```typescript
// In team workspace editor
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('team_workspaces')
      .select('files, last_edited_at')
      .eq('id', workspaceId)
      .single()

    // Check if files changed since last fetch
    if (data.last_edited_at > lastFetchTime) {
      setFiles(data.files)
      setLastFetchTime(data.last_edited_at)
    }
  }, 3000) // Poll every 3 seconds

  return () => clearInterval(interval)
}, [workspaceId])
```

### Phase 2: Supabase Realtime (Better - Implement Later)
```typescript
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
    (payload) => {
      // Real-time update received
      setFiles(payload.new.files)
      toast({
        title: "Workspace Updated",
        description: `${payload.new.last_edited_by} made changes`
      })
    }
  )
  .subscribe()
```

---

## 🗄️ Storage Manager Updates

### Add Team Workspace Support

```typescript
// lib/storage-manager.ts

export interface StorageInterface {
  // ... existing methods for personal workspaces

  // NEW: Team workspace methods
  isTeamWorkspace(workspaceId: string): Promise<boolean>;
  getTeamWorkspaceFiles(workspaceId: string): Promise<File[]>;
  updateTeamWorkspaceFile(workspaceId: string, file: File): Promise<boolean>;
  deleteTeamWorkspaceFile(workspaceId: string, filePath: string): Promise<boolean>;
}
```

### Hybrid Storage Logic

```typescript
class UniversalStorageManager implements StorageInterface {
  async getFiles(workspaceId: string): Promise<File[]> {
    // Check if this is a team workspace
    const isTeam = await this.isTeamWorkspace(workspaceId)

    if (isTeam) {
      // Fetch from Supabase team_workspaces table
      return await this.getTeamWorkspaceFiles(workspaceId)
    } else {
      // Fetch from IndexedDB (existing logic)
      return await this.getPersonalWorkspaceFiles(workspaceId)
    }
  }

  async updateFile(workspaceId: string, fileId: string, updates: Partial<File>): Promise<File | null> {
    const isTeam = await this.isTeamWorkspace(workspaceId)

    if (isTeam) {
      // Update via API call to backend
      const response = await fetch(`/api/teams/workspaces/${workspaceId}/files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
      return await response.json()
    } else {
      // Update in IndexedDB (existing logic)
      return await this.updatePersonalFile(workspaceId, fileId, updates)
    }
  }
}
```

---

## 🔐 Access Control

### Personal Workspace
```typescript
// User can only access their own workspaces
const canAccess = workspace.userId === currentUserId
```

### Team Workspace
```typescript
// Check team membership and role
const { data: member } = await supabase
  .from('team_members')
  .select('role, permissions')
  .eq('organization_id', workspace.organization_id)
  .eq('user_id', currentUserId)
  .single()

const canView = member && ['owner', 'admin', 'editor', 'viewer'].includes(member.role)
const canEdit = member && ['owner', 'admin', 'editor'].includes(member.role)
const canDelete = member && ['owner', 'admin'].includes(member.role)
```

---

## 📊 API Routes for Team Workspace Files

### File Operations

```typescript
// GET /api/teams/[orgId]/workspaces/[workspaceId]/files
// List all files in team workspace

// GET /api/teams/[orgId]/workspaces/[workspaceId]/files/[fileId]
// Get specific file content

// POST /api/teams/[orgId]/workspaces/[workspaceId]/files
// Create new file in team workspace

// PATCH /api/teams/[orgId]/workspaces/[workspaceId]/files/[fileId]
// Update file content

// DELETE /api/teams/[orgId]/workspaces/[workspaceId]/files/[fileId]
// Delete file from team workspace
```

---

## 🎯 Implementation Phases

### Phase 1: Basic Team Workspaces (This Week)
- [ ] API routes for team workspace CRUD
- [ ] API routes for file operations on team workspaces
- [ ] Update storage-manager to detect team vs personal workspaces
- [ ] UI to create team workspace (separate from personal)
- [ ] Simple polling for updates (every 3 seconds)

### Phase 2: Migration & Integration (Next Week)
- [ ] Convert personal workspace to team workspace feature
- [ ] Workspace selector (Personal / Team tabs)
- [ ] Activity feed showing who edited what
- [ ] Conflict detection (warn if file edited by multiple users)

### Phase 3: Real-Time Collaboration (Week 3)
- [ ] Supabase Realtime subscriptions
- [ ] Live cursor positions (who's editing what file)
- [ ] Presence indicators (who's online)
- [ ] File locking (prevent simultaneous edits)

### Phase 4: Advanced Features (Week 4)
- [ ] Operational Transform for conflict resolution
- [ ] Offline mode for team workspaces (queue changes)
- [ ] Version history (track all file changes)
- [ ] Branching (create workspace copies)

---

## 💡 Key Decisions

### ✅ What We're Doing:
1. **Keep personal workspaces in IndexedDB** - No breaking changes
2. **Store team workspaces in Supabase** - Centralized source of truth
3. **Files in JSONB column** - Simple, no separate files table
4. **Hybrid storage manager** - Transparently handles both types
5. **Start with polling** - Ship fast, optimize later

### ❌ What We're NOT Doing (Yet):
1. Migrating existing personal workspaces (user choice)
2. Real-time operational transform (complex, Phase 4)
3. Separate files table (over-engineering for MVP)
4. Desktop app sync (web-only for now)

---

## 📈 Performance Considerations

### Personal Workspaces
- **Read:** ~1-5ms (IndexedDB)
- **Write:** ~5-10ms (IndexedDB) + 5s sync delay
- **Backup size:** ~1-10MB per user

### Team Workspaces
- **Read:** ~50-200ms (Supabase API)
- **Write:** ~100-300ms (Supabase API + activity log)
- **File limit:** ~50MB per workspace (JSONB limit)
- **Concurrent edits:** Handled by RLS + last-write-wins (Phase 1)

---

## 🔧 Database Schema Adjustments Needed

### Add workspace_type column to help storage manager
```sql
-- Add to team_workspaces table
ALTER TABLE team_workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "autoSave": true,
  "maxFileSize": 5242880,
  "allowedFileTypes": ["*"]
}'::jsonb;

-- Create index for file path searches
CREATE INDEX IF NOT EXISTS idx_team_workspaces_files
ON team_workspaces USING GIN (files);
```

---

## 🎬 Next Steps

1. **Implement API routes** (15 endpoints)
2. **Update storage-manager** to detect team workspaces
3. **Create team workspace UI** (separate from personal workspace UI)
4. **Add file operations** for team workspaces
5. **Implement simple polling** for updates
6. **Test with 2-3 team members** editing simultaneously

---

**Author:** Claude Code
**Date:** January 25, 2025
**Version:** 1.0.0

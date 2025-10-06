# 🔄 Auto-Restore Bug - Visual Flow Comparison

## BEFORE FIX (BUG) ❌

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES PROJECT FROM CHAT-INPUT                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. chat-input.tsx                                               │
│    - Creates workspace in IndexedDB                             │
│    - Applies template (creates 45 files)                        │
│    - Files: ✅ SUCCESSFULLY CREATED                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. REDIRECT: /workspace?newProject=abc-123                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. workspace-layout.tsx LOADS (Render 1)                        │
│    URL: ?newProject=abc-123                                     │
│    projectId = searchParams.get('projectId') → NULL             │
│    Auto-restore check: projectId && !isDeletingProject          │
│    Result: FALSE (projectId is null)                            │
│    Action: ✅ Auto-restore SKIPPED (no projectId yet)           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. useEffect #2 RUNS (Project Selection)                        │
│    projectId = searchParams.get('newProject') → abc-123         │
│    Sets: setSelectedProject(project)                            │
│    Updates URL: ?projectId=abc-123                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. workspace-layout.tsx RE-RENDERS (Render 2)                   │
│    URL: ?projectId=abc-123                                      │
│    projectId = searchParams.get('projectId') → abc-123          │
│    isNewProject = 🚨 NOT CHECKED! ❌                            │
│    Auto-restore check: projectId && !isDeletingProject          │
│    Result: TRUE ⚠️                                              │
│    Action: 🚨 AUTO-RESTORE RUNS!                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. restoreBackupFromCloud() EXECUTES                            │
│    Step 1: storageManager.clearAll()                            │
│            ↓                                                     │
│            🚨 DELETES ALL WORKSPACES ❌                          │
│            🚨 DELETES ALL FILES (including new project!) ❌      │
│            🚨 DELETES ALL CHAT SESSIONS ❌                       │
│                                                                  │
│    Step 2: Import backup data from cloud                        │
│            ↓                                                     │
│            Restores OLD projects from backup                    │
│            (New project NOT in backup - just created!)          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RESULT: FILE CONTAMINATION ❌                                │
│    - New project abc-123: DELETED ❌                            │
│    - Old backup projects: RESTORED                              │
│    - User sees files from OLD projects in NEW project slot ❌   │
│    - Sometimes old files overwrite new ones (package.json) ❌   │
└─────────────────────────────────────────────────────────────────┘
```

---

## AFTER FIX (WORKING) ✅

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES PROJECT FROM CHAT-INPUT                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. chat-input.tsx                                               │
│    - Creates workspace in IndexedDB                             │
│    - Applies template (creates 45 files)                        │
│    - Files: ✅ SUCCESSFULLY CREATED                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. REDIRECT: /workspace?newProject=abc-123                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. workspace-layout.tsx LOADS (Render 1)                        │
│    URL: ?newProject=abc-123                                     │
│    projectId = searchParams.get('projectId') → NULL             │
│    isNewProject = searchParams.get('newProject') !== null       │
│                 ↓                                                │
│                 ✅ TRUE (parameter exists!)                      │
│                                                                  │
│    Console: "🆕 NEW PROJECT detected - SKIPPING auto-restore"   │
│    Auto-restore check: projectId && !isNewProject               │
│    Result: FALSE (isNewProject is true)                         │
│    Action: ✅ AUTO-RESTORE SKIPPED! Files preserved!            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. useEffect #2 RUNS (Project Selection)                        │
│    projectId = searchParams.get('newProject') → abc-123         │
│    isNewProjectFromChatInput = TRUE                             │
│                                                                  │
│    Actions:                                                      │
│    ✅ setJustCreatedProject(true) - Extra protection layer      │
│    ✅ Load files explicitly for new project                     │
│    ✅ Verify files belong to correct workspace                  │
│    ✅ setTimeout(() => setJustCreatedProject(false), 5000)      │
│                                                                  │
│    Updates URL: ?projectId=abc-123                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. workspace-layout.tsx RE-RENDERS (Render 2)                   │
│    URL: ?projectId=abc-123                                      │
│    projectId = searchParams.get('projectId') → abc-123          │
│    justCreatedProject = TRUE ✅ (set in previous useEffect)     │
│                                                                  │
│    Auto-restore check: projectId && !justCreatedProject         │
│    Result: FALSE (justCreatedProject is true)                   │
│    Action: ✅ AUTO-RESTORE STILL SKIPPED! Double protection!    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. FILES LOAD SUCCESSFULLY                                      │
│    - New project files: ✅ PRESERVED                            │
│    - No clearAll() called: ✅ CORRECT                           │
│    - No backup restoration: ✅ CORRECT                          │
│    - Console: "✅ Loaded 45 files for new project abc-123"      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. AFTER 5 SECONDS                                              │
│    justCreatedProject = false                                   │
│    Console: "✅ Cleared flag - auto-restore can now run"        │
│    Next visit: Auto-restore will work normally ✅               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. RESULT: SUCCESS ✅                                           │
│    - New project abc-123: ✅ FILES PRESERVED                    │
│    - Correct template files: ✅ ALL 45 FILES PRESENT            │
│    - No contamination: ✅ ONLY NEW PROJECT'S FILES              │
│    - User sees correct project: ✅ PERFECT!                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Changes - Side by Side

### Change #1: Auto-Restore Detection

#### BEFORE ❌
```typescript
// Check if we're in a specific project workspace
const projectId = searchParams.get('projectId')
const isDeletingProject = searchParams.get('deleting') === 'true'

// Only auto-restore when in a project workspace
if (projectId && !isDeletingProject && !justCreatedProject) {
  // 🚨 PROBLEM: No check for newProject parameter!
  // Will run auto-restore on second render when URL changes
  const cloudSyncEnabled = await isCloudSyncEnabled(user.id)
  if (cloudSyncEnabled) {
    await restoreBackupFromCloud(user.id) // 🚨 Deletes all data!
  }
}
```

#### AFTER ✅
```typescript
// Check if we're in a specific project workspace
const projectId = searchParams.get('projectId')
const isDeletingProject = searchParams.get('deleting') === 'true'
const isNewProject = searchParams.get('newProject') !== null // ✅ NEW CHECK

// ✅ Skip auto-restore for newly created projects
if (isNewProject) {
  console.log('🆕 NEW PROJECT detected - SKIPPING auto-restore')
}

// Only auto-restore when in a project workspace
if (projectId && !isDeletingProject && !justCreatedProject && !isNewProject) {
  // ✅ Auto-restore only runs for EXISTING projects
  const cloudSyncEnabled = await isCloudSyncEnabled(user.id)
  if (cloudSyncEnabled) {
    await restoreBackupFromCloud(user.id)
  }
}
```

---

### Change #2: Set Protection Flag

#### BEFORE ❌
```typescript
// Detect new project from chat-input
const isNewProjectFromChatInput = searchParams.get('newProject') === projectId
if (isNewProjectFromChatInput) {
  console.log('🆕 New project from chat-input detected')
  
  // 🚨 PROBLEM: No flag set to protect against auto-restore
  // If auto-restore runs on next render, files will be deleted!
  
  // Load files explicitly
  import('@/lib/storage-manager').then(({ storageManager }) => {
    storageManager.init().then(() => {
      storageManager.getFiles(projectId).then(files => {
        console.log(`Loaded ${files.length} files`)
      })
    })
  })
}
```

#### AFTER ✅
```typescript
// Detect new project from chat-input
const isNewProjectFromChatInput = searchParams.get('newProject') === projectId
if (isNewProjectFromChatInput) {
  console.log('🆕 New project from chat-input detected')
  
  // ✅ Set protection flag to prevent auto-restore
  setJustCreatedProject(true)
  
  // ✅ Clear flag after 5 seconds (enough time for initial load)
  setTimeout(() => {
    setJustCreatedProject(false)
    console.log('✅ Cleared flag - auto-restore can now run on next visit')
  }, 5000)
  
  // Load files explicitly
  import('@/lib/storage-manager').then(({ storageManager }) => {
    storageManager.init().then(() => {
      storageManager.getFiles(projectId).then(files => {
        console.log(`✅ Loaded ${files.length} files for new project ${projectId}`)
      })
    })
  })
}
```

---

## Protection Layers

The fix implements **TWO layers of protection**:

### Layer 1: `isNewProject` Check
```typescript
const isNewProject = searchParams.get('newProject') !== null

if (projectId && !isDeletingProject && !justCreatedProject && !isNewProject) {
  // Auto-restore only runs if isNewProject is FALSE
}
```

**When it protects:**
- ✅ First render when URL has `?newProject=abc-123`
- ✅ Immediately detects new project creation
- ✅ Works even before `justCreatedProject` flag is set

### Layer 2: `justCreatedProject` Flag
```typescript
if (isNewProjectFromChatInput) {
  setJustCreatedProject(true)
  setTimeout(() => setJustCreatedProject(false), 5000)
}

if (projectId && !isDeletingProject && !justCreatedProject && !isNewProject) {
  // Auto-restore only runs if justCreatedProject is FALSE
}
```

**When it protects:**
- ✅ Second render when URL changes to `?projectId=abc-123`
- ✅ Continues protection after URL parameter changes
- ✅ Provides 5-second grace period

### Combined Protection Timeline

```
Time: 0s
├─ URL: ?newProject=abc-123
├─ isNewProject: TRUE ✅
├─ justCreatedProject: FALSE
└─ Result: Protected by Layer 1 ✅

Time: 0.1s (after project selection useEffect)
├─ URL: ?projectId=abc-123
├─ isNewProject: FALSE (newProject param removed)
├─ justCreatedProject: TRUE ✅ (flag set)
└─ Result: Protected by Layer 2 ✅

Time: 5s (after setTimeout)
├─ URL: ?projectId=abc-123
├─ isNewProject: FALSE
├─ justCreatedProject: FALSE
└─ Result: Protection cleared - auto-restore allowed on next visit ✅
```

---

## Key Insights

### Why Two Layers?

**Layer 1 (URL check)** is instant but temporary:
- ✅ Works immediately on page load
- ✅ No delay needed
- ❌ Fails when URL is updated (newProject → projectId)

**Layer 2 (State flag)** is delayed but persistent:
- ✅ Survives URL changes
- ✅ Protects during transition period
- ❌ Requires useEffect to set it (not instant)

**Together:** Complete protection during entire creation flow!

### Why 5 Seconds?

**Too short (1-2s):** Risk of auto-restore running before files fully load  
**Too long (30s+):** User might navigate away and back, expecting restore  
**Just right (5s):** Enough for initial load, not too long for next visit

### Why Not Permanent?

If `justCreatedProject` stayed `true` forever:
- ❌ Auto-restore would NEVER run for that project
- ❌ User couldn't sync changes across devices
- ❌ Backup system would be broken

**5 seconds allows:**
- ✅ Initial creation to complete safely
- ✅ Next visit to restore latest backup
- ✅ Normal backup/restore workflow to continue

---

## Testing Checklist

- [ ] **Create new project from chat-input**
  - [ ] Console shows: "NEW PROJECT detected - SKIPPING auto-restore"
  - [ ] Console shows: "Loaded X files for new project"
  - [ ] NO "Clearing existing data" message
  - [ ] Files visible in file explorer

- [ ] **Check after 5 seconds**
  - [ ] Console shows: "Cleared flag - auto-restore can now run"
  - [ ] justCreatedProject flag is false

- [ ] **Navigate away and back (after 5s)**
  - [ ] Auto-restore runs normally
  - [ ] Console shows: "Calling restoreBackupFromCloud"
  - [ ] Latest backup restored

- [ ] **Create multiple projects quickly**
  - [ ] Each project protected independently
  - [ ] No cross-contamination

- [ ] **Create project with cloud sync disabled**
  - [ ] Console shows: "Cloud sync is disabled"
  - [ ] No auto-restore attempted
  - [ ] Files still preserved

---

**Last Updated:** October 6, 2025  
**Status:** ✅ **FIXED & READY FOR TESTING**

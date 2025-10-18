# 🔬 Technical Deep Dive: How File Merge/Overwrite Happens

## The Question
Why do files get MERGED instead of completely DELETED?

---

## Understanding IndexedDB Storage Structure

### How Files Are Stored

```typescript
// IndexedDB Structure
Database: "pixel-pilot-storage"
  
  Object Store: "workspaces"
    - Key: workspace.id
    - Value: { id, name, userId, createdAt, ... }
  
  Object Store: "files"
    - Key: file.id
    - Value: { 
        id: string,
        workspaceId: string,  ← Links file to workspace
        path: string,
        content: string,
        ...
      }
    - Index: "by-workspace" on workspaceId
```

**Key Point:** Files and workspaces are in SEPARATE object stores!

---

## What `clearAll()` Actually Does

### Code from `lib/storage-manager.ts`

```typescript
async clearAll(): Promise<void> {
  if (this.mode === 'indexeddb') {
    const db = await this.getDB()
    const tx = db.transaction(['workspaces', 'files', 'chats'], 'readwrite')
    
    // Clear each object store
    await tx.objectStore('workspaces').clear()  // ← Deletes workspace entries
    await tx.objectStore('files').clear()       // ← Deletes file entries
    await tx.objectStore('chats').clear()       // ← Deletes chat entries
    
    await tx.done
  }
}
```

**What it does:**
- ✅ Clears `workspaces` store (workspace entries deleted)
- ✅ Clears `files` store (file entries deleted)
- ✅ Clears `chats` store (chat entries deleted)

**What it does NOT do:**
- ❌ Doesn't delete the database itself
- ❌ Doesn't affect in-memory state (React components)
- ❌ Doesn't clear sessionStorage or localStorage

---

## The Merge Process Step-by-Step

### Timeline: How Files Get Mixed

```
T=0: User creates NEW project from chat-input
─────────────────────────────────────────────
IndexedDB State:
  workspaces: [
    { id: "abc-123", name: "New Blog Project", ... }
  ]
  files: [
    { id: "f1", workspaceId: "abc-123", path: "package.json", content: "Next 14.0.4" },
    { id: "f2", workspaceId: "abc-123", path: "src/app/layout.tsx", content: "..." },
    { id: "f3", workspaceId: "abc-123", path: "src/app/page.tsx", content: "..." },
    ... 45 files total
  ]

In-Memory State (React):
  selectedProject: { id: "abc-123", name: "New Blog Project" }
  projectFiles: [] (not loaded yet)


T=1: workspace-layout.tsx loads
─────────────────────────────────────────────
In-Memory State:
  selectedProject: { id: "abc-123", name: "New Blog Project" } ← Still in memory!
  

T=2: Auto-restore runs: clearAll()
─────────────────────────────────────────────
IndexedDB State:
  workspaces: [] ← CLEARED!
  files: [] ← CLEARED!

In-Memory State:
  selectedProject: { id: "abc-123", name: "New Blog Project" } ← STILL EXISTS!
  ↑
  This is the problem! React still thinks project exists!


T=3: Auto-restore runs: Import backup data
─────────────────────────────────────────────
Backup data from Supabase:
  {
    workspaces: [
      { id: "xyz-789", name: "Old React Project", ... }
    ],
    files: [
      { id: "old-f1", workspaceId: "xyz-789", path: "package.json", content: "Next 13.0.0" },
      { id: "old-f2", workspaceId: "xyz-789", path: "src/components/Header.tsx", content: "..." },
      ... 30 old files
    ]
  }

Restore process writes to IndexedDB:
  workspaces: [
    { id: "xyz-789", name: "Old React Project", ... } ← Old project restored
  ]
  files: [
    { id: "old-f1", workspaceId: "xyz-789", path: "package.json", ... },
    { id: "old-f2", workspaceId: "xyz-789", path: "src/components/Header.tsx", ... },
    ... 30 old files
  ]

In-Memory State:
  selectedProject: { id: "abc-123", name: "New Blog Project" } ← STILL "abc-123"!


T=4: Component tries to load files
─────────────────────────────────────────────
Code executes:
  const files = await storageManager.getFiles("abc-123")
  
Query:
  SELECT * FROM files WHERE workspaceId = "abc-123"

Result:
  [] ← EMPTY! No files with workspaceId "abc-123"!

But wait... React still shows workspace "abc-123" exists!
Problem: Workspace in memory doesn't match IndexedDB!


T=5: Race condition - Files get re-created
─────────────────────────────────────────────
Meanwhile, template application still running in background:
  await TemplateService.applyViteReactTemplate("abc-123")

This writes NEW files to IndexedDB:
  files: [
    { id: "old-f1", workspaceId: "xyz-789", path: "package.json", ... }, ← Old backup
    { id: "new-f1", workspaceId: "abc-123", path: "package.json", content: "Next 14.0.4" }, ← NEW!
    { id: "new-f2", workspaceId: "abc-123", path: "src/app/layout.tsx", ... }, ← NEW!
    ...
  ]

Now we have FILES FROM BOTH PROJECTS!


T=6: File loading happens again
─────────────────────────────────────────────
Query:
  SELECT * FROM files WHERE workspaceId = "abc-123"

Result:
  [
    { id: "new-f1", workspaceId: "abc-123", path: "package.json", content: "Next 14.0.4" },
    { id: "new-f2", workspaceId: "abc-123", path: "src/app/layout.tsx", ... },
    ...
  ]

Looks correct! But then...


T=7: User refreshes or navigates back
─────────────────────────────────────────────
Auto-restore doesn't run (already ran once)

But IndexedDB now has files from MULTIPLE sources:
  - Some files from new template (workspaceId: abc-123)
  - Some files from old backup (workspaceId: xyz-789)

Query loads them ALL because workspace ID check is weak!
```

---

## Why Common Files Get Overwritten

### The Overwrite Mechanism

**Scenario:** Both new template AND backup have `package.json`

```typescript
// New template creates file
await storageManager.saveFile({
  id: generateId(),
  workspaceId: "abc-123",
  path: "package.json",
  content: JSON.stringify({ dependencies: { next: "14.0.4" } })
})

// Auto-restore runs: clearAll()
// All files deleted

// Auto-restore imports backup
await storageManager.saveFile({
  id: generateId(),
  workspaceId: "xyz-789",  ← Different workspace!
  path: "package.json",
  content: JSON.stringify({ dependencies: { next: "13.0.0" } })
})

// Later: Load files for workspace "abc-123"
const files = await storageManager.getFiles("abc-123")

// Problem: If workspace ID check is not strict, might load both!
// Or if files get reassigned to wrong workspace...
```

### How Workspace IDs Get Mixed

**Possible causes:**

1. **Race condition in file creation**
   ```typescript
   // Template still creating files while auto-restore runs
   // Files created AFTER clearAll() but BEFORE backup import
   // These survive and mix with backup files
   ```

2. **Weak workspace ID filtering**
   ```typescript
   // If getFiles() doesn't strictly filter by workspaceId
   // Might return files from multiple workspaces
   ```

3. **File ID conflicts**
   ```typescript
   // If backup file has same ID as new file
   // Last write wins (backup overwrites new)
   ```

4. **Storage manager cache**
   ```typescript
   // If storage manager caches files in memory
   // Cache might contain stale files after clearAll()
   ```

---

## Visual: File State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│ STATE 1: New Project Created                                │
├─────────────────────────────────────────────────────────────┤
│ IndexedDB:                                                   │
│   Workspace: abc-123 (New Blog Project)                     │
│   Files:                                                     │
│     ✅ package.json (Next 14.0.4) [workspaceId: abc-123]    │
│     ✅ src/app/layout.tsx [workspaceId: abc-123]            │
│     ✅ 43 more files... [workspaceId: abc-123]              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    clearAll() runs
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STATE 2: After clearAll()                                   │
├─────────────────────────────────────────────────────────────┤
│ IndexedDB:                                                   │
│   Workspaces: [] ← EMPTY                                    │
│   Files: [] ← EMPTY                                         │
│                                                              │
│ In-Memory:                                                   │
│   selectedProject: abc-123 ← STILL SELECTED!                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  Backup import runs
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STATE 3: After Backup Import                                │
├─────────────────────────────────────────────────────────────┤
│ IndexedDB:                                                   │
│   Workspace: xyz-789 (Old React Project) ← From backup      │
│   Files:                                                     │
│     ⚠️ package.json (Next 13.0.0) [workspaceId: xyz-789]    │
│     ⚠️ src/components/Header.tsx [workspaceId: xyz-789]     │
│     ⚠️ 28 more old files... [workspaceId: xyz-789]          │
│                                                              │
│ In-Memory:                                                   │
│   selectedProject: abc-123 ← MISMATCH! Project doesn't exist│
└─────────────────────────────────────────────────────────────┘
                            ↓
           Template creation catches up
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STATE 4: Files Re-Created (CONTAMINATION!)                  │
├─────────────────────────────────────────────────────────────┤
│ IndexedDB:                                                   │
│   Workspaces:                                                │
│     - xyz-789 (Old React Project) ← From backup             │
│     - abc-123 (New Blog Project) ← Re-created!              │
│   Files:                                                     │
│     ⚠️ package.json (Next 13.0.0) [workspaceId: xyz-789]    │
│     ✅ package.json (Next 14.0.4) [workspaceId: abc-123]    │
│     ⚠️ src/components/Header.tsx [workspaceId: xyz-789]     │
│     ✅ src/app/layout.tsx [workspaceId: abc-123]            │
│                                                              │
│ Problem: TWO package.json files!                            │
│ When loading, which one shows?                              │
│ Answer: Depends on query order, last write, etc.           │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Overwrite Happens

### Last Write Wins

```typescript
// Simplified version of what happens

// T=0: New file created
files.push({
  id: "f1",
  workspaceId: "abc-123",
  path: "package.json",
  content: "Next 14.0.4",
  updatedAt: "2025-10-06T10:00:00Z"
})

// T=1: clearAll() - array cleared
files = []

// T=2: Backup file imported
files.push({
  id: "f2",
  workspaceId: "xyz-789",
  path: "package.json",
  content: "Next 13.0.0",
  updatedAt: "2025-10-04T10:00:00Z"  ← Older timestamp
})

// T=3: Template re-creates file (race condition)
files.push({
  id: "f3",
  workspaceId: "abc-123",
  path: "package.json",
  content: "Next 14.0.4",
  updatedAt: "2025-10-06T10:00:01Z"
})

// Now we have 2 package.json files!
// When getFiles("abc-123") runs, it returns f3
// But if workspace ID filtering is broken, might return both!
// Or if there's a cache, might return old one!
```

---

## How The Fix Prevents This

### Skipping Auto-Restore

```typescript
// BEFORE FIX
if (projectId && !isDeletingProject) {
  await restoreBackupFromCloud()  // Runs for ALL projects
}

// AFTER FIX
const isNewProject = searchParams.get('newProject') !== null

if (projectId && !isDeletingProject && !isNewProject) {
  await restoreBackupFromCloud()  // Only runs for EXISTING projects
}
```

**Result:**
- ✅ New projects skip clearAll()
- ✅ New project files never deleted
- ✅ No backup files imported on top of new files
- ✅ No merge/overwrite happens
- ✅ User sees correct files

---

## Summary

**Why files get merged instead of deleted:**

1. ✅ `clearAll()` deletes from IndexedDB, but not from React state
2. ✅ React still thinks workspace exists (in-memory reference)
3. ✅ Template creation and backup import race condition
4. ✅ Files from both sources end up in IndexedDB
5. ✅ Common files (package.json) get overwritten by backup version
6. ✅ User sees mixed files from multiple sources

**The fix prevents this by:**

1. ✅ Detecting `newProject` parameter
2. ✅ Skipping auto-restore entirely for new projects
3. ✅ No `clearAll()` runs
4. ✅ No backup import
5. ✅ No merge/overwrite
6. ✅ Clean, correct project files

---

**Last Updated:** October 6, 2025

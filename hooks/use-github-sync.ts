import { useState, useEffect, useCallback, useRef } from 'react'
import { storageEventManager, type StorageEventData } from '@/lib/storage-events'
import { storageManager } from '@/lib/storage-manager'
import {
  commitFiles,
  pullChanges,
  checkForRemoteChanges,
  ConflictError,
} from '@/lib/github-client'

interface UseGitHubSyncOptions {
  workspaceId: string | undefined
  teamWorkspaceId: string | undefined
  isTeamWorkspace: boolean
  isGitHubBacked: boolean
}

interface CommitResult {
  success: boolean
  sha?: string
  commitUrl?: string
  error?: string
  isConflict?: boolean
}

interface PullResult {
  success: boolean
  filesUpdated?: number
  error?: string
}

export function useGitHubSync({
  workspaceId,
  teamWorkspaceId,
  isTeamWorkspace,
  isGitHubBacked,
}: UseGitHubSyncOptions) {
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set())
  const [deletedFiles, setDeletedFiles] = useState<Set<string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [lastKnownSha, setLastKnownSha] = useState<string | null>(null)
  const [hasRemoteChanges, setHasRemoteChanges] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const changedRef = useRef<Set<string>>(new Set())
  const deletedRef = useRef<Set<string>>(new Set())
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActive = isTeamWorkspace && isGitHubBacked && !!teamWorkspaceId

  // Load lastKnownSha from IndexedDB workspace metadata
  useEffect(() => {
    if (!isActive || !workspaceId) return

    const loadSha = async () => {
      try {
        await storageManager.init()
        const workspaces = await storageManager.getWorkspaces('')
        const ws = workspaces.find(w => w.id === workspaceId)
        if (ws && (ws as any).githubLastSyncedSha) {
          setLastKnownSha((ws as any).githubLastSyncedSha)
        }
      } catch {}
    }
    loadSha()
  }, [isActive, workspaceId])

  // Track file changes via storage events
  useEffect(() => {
    if (!isActive || !workspaceId) return

    const handleEvent = (event: StorageEventData) => {
      if (event.tableName !== 'files') return
      if (event.record?.workspaceId && event.record.workspaceId !== workspaceId) return

      const filePath = event.record?.path
      if (!filePath) return

      if (event.operation === 'delete') {
        deletedRef.current.add(filePath)
        changedRef.current.delete(filePath)
      } else {
        changedRef.current.add(filePath)
        deletedRef.current.delete(filePath)
      }

      setChangedFiles(new Set(changedRef.current))
      setDeletedFiles(new Set(deletedRef.current))
      setSyncError(null)
    }

    const unsubscribe = storageEventManager.on('files', handleEvent)

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.projectId === workspaceId) {
        if (detail?.path) {
          changedRef.current.add(detail.path)
          setChangedFiles(new Set(changedRef.current))
        }
        setSyncError(null)
      }
    }

    window.addEventListener('files-changed', handleCustomEvent)

    return () => {
      unsubscribe()
      window.removeEventListener('files-changed', handleCustomEvent)
    }
  }, [isActive, workspaceId])

  // Poll for remote changes every 30s
  useEffect(() => {
    if (!isActive || !teamWorkspaceId || !lastKnownSha) return

    const checkRemote = async () => {
      try {
        const result = await checkForRemoteChanges(teamWorkspaceId, lastKnownSha)
        setHasRemoteChanges(result.hasChanges)
      } catch {
        // Silently fail on poll errors
      }
    }

    // Check on mount and on window focus
    checkRemote()
    const handleFocus = () => checkRemote()
    window.addEventListener('focus', handleFocus)

    pollIntervalRef.current = setInterval(checkRemote, 30000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [isActive, teamWorkspaceId, lastKnownSha])

  // Commit to GitHub
  const commitToGitHub = useCallback(async (
    message: string,
    filesToCommit: Array<{ path: string; content: string }>,
    pathsToDelete: string[]
  ): Promise<CommitResult> => {
    if (!teamWorkspaceId || !workspaceId) {
      return { success: false, error: 'Missing workspace info' }
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await commitFiles(
        teamWorkspaceId,
        filesToCommit,
        pathsToDelete,
        message,
        lastKnownSha || ''
      )

      // Update local SHA
      setLastKnownSha(result.sha)
      setHasRemoteChanges(false)

      // Clear tracked changes for committed files
      for (const f of filesToCommit) {
        changedRef.current.delete(f.path)
      }
      for (const p of pathsToDelete) {
        deletedRef.current.delete(p)
      }
      setChangedFiles(new Set(changedRef.current))
      setDeletedFiles(new Set(deletedRef.current))

      // Persist SHA in workspace metadata
      try {
        await storageManager.init()
        const workspaces = await storageManager.getWorkspaces('')
        const ws = workspaces.find(w => w.id === workspaceId)
        if (ws) {
          await storageManager.updateWorkspace(workspaceId, {
            ...ws,
            githubLastSyncedSha: result.sha,
          } as any)
        }
      } catch {}

      return { success: true, sha: result.sha, commitUrl: result.commitUrl }
    } catch (error: any) {
      const isConflict = error instanceof ConflictError
      const errorMsg = error.message || 'Commit failed'
      setSyncError(errorMsg)

      if (isConflict) {
        setHasRemoteChanges(true)
      }

      return { success: false, error: errorMsg, isConflict }
    } finally {
      setIsSyncing(false)
    }
  }, [teamWorkspaceId, workspaceId, lastKnownSha])

  // Pull from GitHub
  const pullFromGitHub = useCallback(async (): Promise<PullResult> => {
    if (!teamWorkspaceId || !workspaceId) {
      return { success: false, error: 'Missing workspace info' }
    }

    setIsPulling(true)
    setSyncError(null)

    try {
      const result = await pullChanges(teamWorkspaceId)

      // Update IndexedDB with fetched files
      await storageManager.init()

      for (const file of result.files) {
        const path = file.path.startsWith('/') ? file.path : `/${file.path}`
        const name = path.split('/').pop() || file.path
        const existing = await storageManager.getFile(workspaceId, path)

        if (existing) {
          await storageManager.updateFile(workspaceId, path, {
            content: file.content,
          })
        } else {
          await storageManager.createFile({
            workspaceId,
            name,
            path,
            content: file.content,
            fileType: path.split('.').pop() || 'text',
            type: 'file',
            size: file.content.length,
            isDirectory: false,
          })
        }
      }

      // Update SHA
      setLastKnownSha(result.sha)
      setHasRemoteChanges(false)

      // Persist SHA
      try {
        const workspaces = await storageManager.getWorkspaces('')
        const ws = workspaces.find(w => w.id === workspaceId)
        if (ws) {
          await storageManager.updateWorkspace(workspaceId, {
            ...ws,
            githubLastSyncedSha: result.sha,
          } as any)
        }
      } catch {}

      // Trigger file explorer refresh
      window.dispatchEvent(new CustomEvent('files-changed', {
        detail: { projectId: workspaceId },
      }))

      return { success: true, filesUpdated: result.files.length }
    } catch (error: any) {
      const errorMsg = error.message || 'Pull failed'
      setSyncError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsPulling(false)
    }
  }, [teamWorkspaceId, workspaceId])

  // Clear pending changes
  const clearPending = useCallback(() => {
    changedRef.current.clear()
    deletedRef.current.clear()
    setChangedFiles(new Set())
    setDeletedFiles(new Set())
    setSyncError(null)
  }, [])

  const pendingCount = changedFiles.size + deletedFiles.size

  return {
    changedFiles,
    deletedFiles,
    pendingCount,
    isSyncing,
    isPulling,
    lastKnownSha,
    hasRemoteChanges,
    syncError,
    commitToGitHub,
    pullFromGitHub,
    clearPending,
    setLastKnownSha,
  }
}

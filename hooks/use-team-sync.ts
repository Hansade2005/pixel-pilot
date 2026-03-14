import { useState, useEffect, useCallback, useRef } from 'react'
import { storageEventManager, type StorageEventData } from '@/lib/storage-events'
import { storageManager } from '@/lib/storage-manager'

interface UseTeamSyncOptions {
  workspaceId: string | undefined
  teamWorkspaceId: string | undefined
  isTeamWorkspace: boolean
  userId: string
}

interface SyncResult {
  success: boolean
  synced?: number
  deleted?: number
  error?: string
  blockedFiles?: string[]
}

export function useTeamSync({
  workspaceId,
  teamWorkspaceId,
  isTeamWorkspace,
  userId,
}: UseTeamSyncOptions) {
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set())
  const [deletedFiles, setDeletedFiles] = useState<Set<string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const changedRef = useRef<Set<string>>(new Set())
  const deletedRef = useRef<Set<string>>(new Set())

  // Listen to storage events for file changes
  useEffect(() => {
    if (!isTeamWorkspace || !workspaceId) return

    const handleEvent = (event: StorageEventData) => {
      // Only track file events for this workspace
      if (event.tableName !== 'files') return
      if (event.record?.workspaceId && event.record.workspaceId !== workspaceId) return

      const filePath = event.record?.path
      if (!filePath) return

      if (event.operation === 'delete') {
        deletedRef.current.add(filePath)
        changedRef.current.delete(filePath)
        setDeletedFiles(new Set(deletedRef.current))
        setChangedFiles(new Set(changedRef.current))
      } else {
        // create or update
        changedRef.current.add(filePath)
        deletedRef.current.delete(filePath) // If re-created after delete
        setChangedFiles(new Set(changedRef.current))
        setDeletedFiles(new Set(deletedRef.current))
      }

      // Clear any previous sync error when new changes come in
      setSyncError(null)
    }

    const unsubscribe = storageEventManager.on('files', handleEvent)

    // Also listen for the files-changed custom event (from visual editor, AI chat, etc.)
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.projectId === workspaceId && detail?.path) {
        changedRef.current.add(detail.path)
        setChangedFiles(new Set(changedRef.current))
        setSyncError(null)
      }
    }

    window.addEventListener('files-changed', handleCustomEvent)

    return () => {
      unsubscribe()
      window.removeEventListener('files-changed', handleCustomEvent)
    }
  }, [isTeamWorkspace, workspaceId])

  // Total pending changes count
  const pendingCount = changedFiles.size + deletedFiles.size

  // Sync changed files to team workspace
  const syncToTeam = useCallback(async (): Promise<SyncResult> => {
    if (!teamWorkspaceId || !workspaceId || pendingCount === 0) {
      return { success: true, synced: 0, deleted: 0 }
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      // Get the actual file contents from IndexedDB for changed files
      const changedPaths = Array.from(changedRef.current)
      const deletedPaths = Array.from(deletedRef.current)

      const filesToSync = []
      for (const path of changedPaths) {
        const file = await storageManager.getFile(workspaceId, path)
        if (file) {
          filesToSync.push({
            path: file.path,
            name: file.name,
            content: file.content,
            fileType: file.fileType,
            size: file.size,
            isDirectory: file.isDirectory,
          })
        }
      }

      // Call the bulk sync API
      const response = await fetch(`/api/teams/workspaces/${teamWorkspaceId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToSync,
          deletedPaths: deletedPaths.length > 0 ? deletedPaths : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.blockedFiles
          ? `Locked by another user: ${data.blockedFiles.join(', ')}`
          : data.error || 'Sync failed'
        setSyncError(errorMsg)
        return {
          success: false,
          error: errorMsg,
          blockedFiles: data.blockedFiles,
        }
      }

      // Clear tracked changes on success
      changedRef.current.clear()
      deletedRef.current.clear()
      setChangedFiles(new Set())
      setDeletedFiles(new Set())
      setLastSyncAt(new Date().toISOString())

      return {
        success: true,
        synced: data.synced,
        deleted: data.deleted,
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Network error during sync'
      setSyncError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsSyncing(false)
    }
  }, [teamWorkspaceId, workspaceId, pendingCount])

  // Clear all pending changes (e.g., if user discards)
  const clearPending = useCallback(() => {
    changedRef.current.clear()
    deletedRef.current.clear()
    setChangedFiles(new Set())
    setDeletedFiles(new Set())
    setSyncError(null)
  }, [])

  return {
    changedFiles,
    deletedFiles,
    pendingCount,
    isSyncing,
    lastSyncAt,
    syncError,
    syncToTeam,
    clearPending,
  }
}

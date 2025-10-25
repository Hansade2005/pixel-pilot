'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface TeamWorkspaceFile {
  id: string
  path: string
  name: string
  content: string
  fileType: string
  lastEditedBy: string
  lastEditedAt: string
}

interface UseTeamWorkspaceSyncProps {
  workspaceId: string | null
  isTeamWorkspace: boolean
  enabled?: boolean
}

export function useTeamWorkspaceSync({
  workspaceId,
  isTeamWorkspace,
  enabled = true
}: UseTeamWorkspaceSyncProps) {
  const [files, setFiles] = useState<TeamWorkspaceFile[]>([])
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!workspaceId || !isTeamWorkspace || !enabled) {
      setIsConnected(false)
      return
    }

    console.log(`[Team Workspace Sync] Setting up realtime for workspace: ${workspaceId}`)

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
          console.log('[Team Workspace Sync] Workspace updated:', payload)

          // Get current user
          const { data: { user } } = await supabase.auth.getUser()
          const wasEditedByMe = payload.new.last_edited_by === user?.id

          if (!wasEditedByMe) {
            // Another team member made changes
            console.log('[Team Workspace Sync] Changes made by another user, updating local state')

            setFiles(payload.new.files || [])
            setLastEditedBy(payload.new.last_edited_by)

            // Show toast notification
            toast({
              title: 'Workspace Updated',
              description: 'A team member made changes to the workspace',
              duration: 3000
            })

            // Trigger a custom event that the chat panel can listen to
            window.dispatchEvent(new CustomEvent('team-workspace-updated', {
              detail: {
                workspaceId,
                files: payload.new.files,
                lastEditedBy: payload.new.last_edited_by
              }
            }))
          } else {
            console.log('[Team Workspace Sync] Changes made by current user, skipping notification')
          }
        }
      )
      .subscribe((status) => {
        console.log('[Team Workspace Sync] Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Cleanup
    return () => {
      console.log(`[Team Workspace Sync] Cleaning up realtime for workspace: ${workspaceId}`)
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [workspaceId, isTeamWorkspace, enabled, toast, supabase])

  /**
   * Manually refresh files from the database
   */
  const refresh = async () => {
    if (!workspaceId || !isTeamWorkspace) return

    console.log(`[Team Workspace Sync] Manually refreshing workspace: ${workspaceId}`)

    try {
      const { data, error } = await supabase
        .from('team_workspaces')
        .select('files, last_edited_by')
        .eq('id', workspaceId)
        .single()

      if (error) {
        console.error('[Team Workspace Sync] Error refreshing:', error)
        return
      }

      if (data) {
        setFiles(data.files || [])
        setLastEditedBy(data.last_edited_by)
        console.log(`[Team Workspace Sync] Refreshed ${data.files?.length || 0} files`)
      }
    } catch (error) {
      console.error('[Team Workspace Sync] Error refreshing:', error)
    }
  }

  return {
    files,
    lastEditedBy,
    isConnected,
    refresh
  }
}

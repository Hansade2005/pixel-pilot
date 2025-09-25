"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { storageManager, type Workspace as Project } from "@/lib/storage-manager"
import { getDeploymentTokens } from "@/lib/cloud-sync"

interface PushState {
  isPushing: boolean
  error: string | null
}

interface PushOptions {
  commitMessage?: string
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export function useGitHubPush() {
  const [pushState, setPushState] = useState<PushState>({
    isPushing: false,
    error: null
  })

  /**
   * Check if a project has GitHub connection set up
   */
  const checkGitHubConnection = async (project: Project): Promise<{
    connected: boolean
    hasToken: boolean
    hasRepo: boolean
    reason?: string
  }> => {
    try {
      // Check if project has a GitHub repo URL
      const hasRepo = Boolean(project.githubRepoUrl)
      
      // Get current user and check for GitHub token
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return {
          connected: false,
          hasToken: false,
          hasRepo,
          reason: "User not authenticated"
        }
      }

      // Check if GitHub token exists
      const tokens = await getDeploymentTokens(user.id)
      const hasToken = Boolean(tokens?.github)

      return {
        connected: hasToken && hasRepo,
        hasToken,
        hasRepo,
        reason: !hasToken 
          ? "GitHub token not configured" 
          : !hasRepo 
            ? "No GitHub repository connected"
            : undefined
      }
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      return {
        connected: false,
        hasToken: false,
        hasRepo: false,
        reason: "Failed to check connection status"
      }
    }
  }

  /**
   * Push changes to GitHub repository
   */
  const pushToGitHub = async (
    project: Project, 
    options: PushOptions = {}
  ): Promise<boolean> => {
    const { 
      commitMessage = "Update project files from PixelPilot", 
      onSuccess, 
      onError 
    } = options

    setPushState({ isPushing: true, error: null })

    try {
      // Check connection status first
      const connectionStatus = await checkGitHubConnection(project)
      if (!connectionStatus.connected) {
        const errorMsg = connectionStatus.reason || "GitHub not connected"
        setPushState({ isPushing: false, error: errorMsg })
        onError?.(errorMsg)
        toast({
          title: "GitHub Push Failed",
          description: errorMsg,
          variant: "destructive"
        })
        return false
      }

      // Get current user for token access
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get stored tokens
      const tokens = await getDeploymentTokens(user.id)
      if (!tokens?.github) {
        throw new Error("GitHub token not found")
      }

      // Get project files
      await storageManager.init()
      const projectFiles = await storageManager.getFiles(project.id)

      if (projectFiles.length === 0) {
        throw new Error("No files found in the workspace to push")
      }

      // Extract repo info from GitHub URL
      const repoUrl = project.githubRepoUrl!
      const repoInfo = repoUrl.split('/').slice(-2).join('/')
      
      if (!repoInfo || !repoInfo.includes('/')) {
        throw new Error("Invalid GitHub repository URL")
      }

      // Push to GitHub using the deployment API
      const pushResponse = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          githubToken: tokens.github,
          repoName: repoInfo.split('/')[1],
          files: projectFiles,
          mode: 'push', // This tells the API to push to existing repo
          existingRepo: repoInfo,
          commitMessage,
        })
      })

      if (!pushResponse.ok) {
        const errorData = await pushResponse.json()
        throw new Error(errorData.error || 'Failed to push changes to GitHub')
      }

      const pushData = await pushResponse.json()

      // Update project's last activity
      await storageManager.updateWorkspace(project.id, {
        lastActivity: new Date().toISOString(),
      })

      // Create deployment record for tracking
      await storageManager.createDeployment({
        workspaceId: project.id,
        url: repoUrl,
        status: 'ready',
        commitSha: pushData.commitSha || 'updated',
        commitMessage: pushData.commitMessage || commitMessage,
        branch: 'main',
        environment: 'production',
        provider: 'github'
      })

      setPushState({ isPushing: false, error: null })
      
      toast({
        title: "Changes Pushed Successfully",
        description: `Pushed to ${project.githubRepoName || repoInfo}`,
        variant: "default"
      })

      onSuccess?.(pushData)
      return true

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to push changes'
      setPushState({ isPushing: false, error: errorMsg })
      onError?.(errorMsg)
      
      toast({
        title: "GitHub Push Failed",
        description: errorMsg,
        variant: "destructive"
      })
      
      return false
    }
  }

  return {
    pushState,
    pushToGitHub,
    checkGitHubConnection,
    isPushing: pushState.isPushing
  }
}
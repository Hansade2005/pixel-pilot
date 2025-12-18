"use client"

import { useState, useCallback } from "react"
import { toast } from "@/hooks/use-toast"

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: string
  private: boolean
  html_url: string
  description: string | null
  language: string | null
  updated_at: string
  default_branch: string
  permissions: {
    admin: boolean
    push: boolean
    pull: boolean
  }
  archived: boolean
  disabled: boolean
}

interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

interface ConnectionStatus {
  connected: boolean
  has_token: boolean
  user?: GitHubUser
  error?: string
  message: string
  setup_url?: string
}

interface RepoAgentState {
  connectionStatus: ConnectionStatus | null
  repositories: GitHubRepo[]
  isLoadingConnection: boolean
  isLoadingRepos: boolean
  error: string | null
}

export function useRepoAgent() {
  const [state, setState] = useState<RepoAgentState>({
    connectionStatus: null,
    repositories: [],
    isLoadingConnection: false,
    isLoadingRepos: false,
    error: null
  })

  // Check GitHub connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoadingConnection: true, error: null }))

    try {
      const response = await fetch('/api/repo-agent/connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data: ConnectionStatus = await response.json()

      setState(prev => ({
        ...prev,
        connectionStatus: data,
        isLoadingConnection: false
      }))

      return data.connected
    } catch (error) {
      const errorMessage = 'Failed to check GitHub connection'
      console.error(errorMessage, error)

      setState(prev => ({
        ...prev,
        isLoadingConnection: false,
        error: errorMessage
      }))

      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive'
      })

      return false
    }
  }, [])

  // Fetch user's GitHub repositories
  const fetchRepositories = useCallback(async (): Promise<GitHubRepo[]> => {
    setState(prev => ({ ...prev, isLoadingRepos: true, error: null }))

    try {
      const response = await fetch('/api/repo-agent/repos', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch repositories')
      }

      const data = await response.json()

      if (!data.connected) {
        throw new Error(data.message || 'GitHub not connected')
      }

      setState(prev => ({
        ...prev,
        repositories: data.repositories || [],
        isLoadingRepos: false
      }))

      return data.repositories || []
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch repositories'
      console.error('Error fetching repositories:', error)

      setState(prev => ({
        ...prev,
        isLoadingRepos: false,
        error: errorMessage
      }))

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })

      return []
    }
  }, [])

  // Refresh both connection and repositories
  const refresh = useCallback(async () => {
    const connected = await checkConnection()
    if (connected) {
      await fetchRepositories()
    }
  }, [checkConnection, fetchRepositories])

  return {
    // State
    connectionStatus: state.connectionStatus,
    repositories: state.repositories,
    isLoadingConnection: state.isLoadingConnection,
    isLoadingRepos: state.isLoadingRepos,
    error: state.error,
    isConnected: state.connectionStatus?.connected || false,

    // Actions
    checkConnection,
    fetchRepositories,
    refresh
  }
}
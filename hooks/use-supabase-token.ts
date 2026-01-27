import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getValidSupabaseToken, isSupabaseTokenExpired } from '@/lib/cloud-sync'

interface UseSupabaseTokenReturn {
  token: string | null
  isLoading: boolean
  isExpired: boolean
  error: string | null
  refreshToken: () => Promise<void>
  lastRefresh: Date | null
}

/**
 * React hook for managing Supabase access tokens with automatic refresh
 */
export function useSupabaseToken(): UseSupabaseTokenReturn {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const supabase = createClient()

  const checkTokenStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToken(null)
        setIsExpired(true)
        return
      }

      const expired = await isSupabaseTokenExpired(user.id)
      setIsExpired(expired)

      if (!expired) {
        const validToken = await getValidSupabaseToken(user.id)
        setToken(validToken)
        setError(null)
      } else {
        setToken(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsExpired(true)
      setToken(null)
    }
  }, [supabase])

  const refreshToken = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const validToken = await getValidSupabaseToken(user.id)
      if (validToken) {
        setToken(validToken)
        setIsExpired(false)
        setLastRefresh(new Date())
        setError(null)
      } else {
        throw new Error('Failed to refresh token')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token')
      setIsExpired(true)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Check token status on mount and when auth state changes
  useEffect(() => {
    checkTokenStatus()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkTokenStatus()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkTokenStatus, supabase])

  // Set up periodic token status checks (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkTokenStatus()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [checkTokenStatus])

  // Auto-refresh token if it's expired
  useEffect(() => {
    if (isExpired && !isLoading) {
      refreshToken()
    }
  }, [isExpired, isLoading, refreshToken])

  return {
    token,
    isLoading,
    isExpired,
    error,
    refreshToken,
    lastRefresh
  }
}
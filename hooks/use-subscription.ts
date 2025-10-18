import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SubscriptionData {
  plan: string
  status: string
  deploymentsThisMonth: number
  githubPushesThisMonth: number
  subscriptionEndDate?: string
  cancelAtPeriodEnd?: boolean
}

export function useSubscription(pollInterval = 300000) { // 5 minutes default
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Get user settings from database directly
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError || !userSettings) {
        // Default to free plan if no settings found
        setSubscription({
          plan: 'free',
          status: 'active',
          deploymentsThisMonth: 0,
          githubPushesThisMonth: 0,
          subscriptionEndDate: undefined,
          cancelAtPeriodEnd: false
        })
      } else {
        // Use the data from user_settings table directly
        setSubscription({
          plan: userSettings.subscription_plan || 'free',
          status: userSettings.subscription_status || 'active',
          deploymentsThisMonth: userSettings.deployments_this_month || 0,
          githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
          subscriptionEndDate: userSettings.cancel_at_period_end ? userSettings.updated_at : undefined,
          cancelAtPeriodEnd: userSettings.cancel_at_period_end || false
        })
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const refreshSubscription = useCallback(() => {
    fetchSubscription()
  }, [fetchSubscription])

  useEffect(() => {
    // Initial fetch
    fetchSubscription()

    // Set up polling
    const interval = setInterval(fetchSubscription, pollInterval)

    return () => clearInterval(interval)
  }, [fetchSubscription, pollInterval])

  // Set up real-time subscription for user_settings changes
  useEffect(() => {
    // Get current user first to filter the subscription
    const getUserAndSubscribe = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const channel = supabase
            .channel(`user-settings-updates-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_settings',
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                console.log('User settings updated:', payload)
                // Refetch subscription data when user_settings changes
                fetchSubscription()
              }
            )
            .subscribe()

          return () => {
            supabase.removeChannel(channel)
          }
        }
      } catch (error) {
        console.error('Error setting up real-time subscription:', error)
      }
    }

    getUserAndSubscribe()
  }, [supabase, fetchSubscription])

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
  }
}

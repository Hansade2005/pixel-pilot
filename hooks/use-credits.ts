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

export function useCredits(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSubscription = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      // Import supabase client and fetch directly from user_settings table
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Get user settings from database directly
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
      console.error('Error fetching subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshSubscription = useCallback(() => {
    fetchSubscription()
  }, [fetchSubscription])

  useEffect(() => {
    if (userId) {
      fetchSubscription()
    }
  }, [userId, fetchSubscription])

  // Set up real-time subscription for user_settings updates
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`user-settings-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('User settings updated:', payload)
          // Refresh subscription data when user_settings table changes
          fetchSubscription()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchSubscription])

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
    // Helper computed values
    isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
    isTrialing: subscription?.status === 'trialing',
    isCancelled: subscription?.cancelAtPeriodEnd,
    plan: subscription?.plan || 'free',
    deploymentsUsed: subscription?.deploymentsThisMonth || 0,
    githubPushesUsed: subscription?.githubPushesThisMonth || 0,
    subscriptionEndDate: subscription?.subscriptionEndDate
  }
}

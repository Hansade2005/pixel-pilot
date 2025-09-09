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

      // Fetch subscription status from API
      const response = await fetch('/api/stripe/check-subscription', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      } else {
        throw new Error('Failed to fetch subscription')
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

  // Set up real-time subscription for subscription updates
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`subscription-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Subscription updated:', payload)
          // Refresh subscription when user_settings table changes
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

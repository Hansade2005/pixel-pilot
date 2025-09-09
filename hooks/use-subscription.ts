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

      // Get subscription data from limits API (which includes all plan information)
      const limitsResponse = await fetch('/api/limits/status')

      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json()

        // Get subscription status from Stripe API
        const stripeResponse = await fetch('/api/stripe/check-subscription', {
          method: 'POST',
        })

        let stripeData = {}
        if (stripeResponse.ok) {
          stripeData = await stripeResponse.json()
        }

        // Combine both data sources
        const combinedData = {
          plan: limitsData.plan,
          status: stripeData.status || 'active',
          deploymentsThisMonth: limitsData.deploymentsThisMonth || 0,
          githubPushesThisMonth: limitsData.githubPushesThisMonth || 0,
          subscriptionEndDate: stripeData.subscriptionEndDate,
          cancelAtPeriodEnd: stripeData.cancelAtPeriodEnd
        }

        setSubscription(combinedData)
        setError(null)
      } else {
        throw new Error('Failed to fetch subscription')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Optional: Set up Supabase realtime subscription for user_settings changes
  useEffect(() => {
    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
        },
        (payload) => {
          console.log('Subscription updated:', payload)
          // Refetch subscription data when user_settings changes
          fetchSubscription()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchSubscription])

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
  }
}

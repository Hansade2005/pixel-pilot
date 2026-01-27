"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SubscriptionData {
  id: string
  user_id: string
  plan: string
  status: string
  current_period_end: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  cancel_at_period_end: boolean
  githubPushesThisMonth?: number
  deploymentsThisMonth?: number
  created_at: string
  updated_at: string
}

// Global cache to share across all components
let subscriptionCache: SubscriptionData | null = null
let cacheTimestamp: number = 0
let isLoading = false
let realtimeChannel: any = null

// Session storage key
const CACHE_KEY = 'pipilot_subscription_cache'
const CACHE_TIMESTAMP_KEY = 'pipilot_subscription_cache_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Load from session storage on initialization
if (typeof window !== 'undefined') {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp)
      if (age < CACHE_DURATION) {
        subscriptionCache = JSON.parse(cached)
        cacheTimestamp = parseInt(timestamp)
      }
    }
  } catch (error) {
    // Silently fail - session storage errors are not critical
  }
}

export function useSubscriptionCache(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(subscriptionCache)
  const [loading, setLoading] = useState(!subscriptionCache)

  useEffect(() => {
    if (!userId) {
      setSubscription(null)
      setLoading(false)
      return
    }

    // If we have valid cache, use it immediately
    const cacheAge = Date.now() - cacheTimestamp
    if (subscriptionCache && cacheAge < CACHE_DURATION) {
      setSubscription(subscriptionCache)
      setLoading(false)
      return
    }

    // Otherwise fetch fresh data
    const fetchSubscription = async () => {
      if (isLoading) {
        // Wait for existing load to complete
        const checkInterval = setInterval(() => {
          if (!isLoading && subscriptionCache) {
            setSubscription(subscriptionCache)
            setLoading(false)
            clearInterval(checkInterval)
          }
        }, 100)
        return
      }

      isLoading = true
      setLoading(true)

      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('user_settings')
          .select(`
            id,
            user_id,
            subscription_plan,
            subscription_status,
            subscription_end_date,
            stripe_customer_id,
            stripe_subscription_id,
            cancel_at_period_end,
            github_pushes_this_month,
            deployments_this_month,
            created_at,
            updated_at
          `)
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          isLoading = false
          setLoading(false)
          return
        }

        const subscriptionData = data ? {
          id: data.id,
          user_id: data.user_id,
          plan: data.subscription_plan || 'free',
          status: data.subscription_status || 'active',
          current_period_end: data.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
          cancel_at_period_end: data.cancel_at_period_end || false,
          githubPushesThisMonth: data.github_pushes_this_month || 0,
          deploymentsThisMonth: data.deployments_this_month || 0,
          created_at: data.created_at,
          updated_at: data.updated_at
        } : {
          id: '',
          user_id: userId,
          plan: 'free',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          githubPushesThisMonth: 0,
          deploymentsThisMonth: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Update cache
        subscriptionCache = subscriptionData
        cacheTimestamp = Date.now()

        // Save to session storage
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(subscriptionData))
          sessionStorage.setItem(CACHE_TIMESTAMP_KEY, cacheTimestamp.toString())
        } catch (error) {
          // Silently fail - session storage errors are not critical
        }

        setSubscription(subscriptionData)

        // Set up Realtime subscription (only once)
        if (!realtimeChannel) {
          realtimeChannel = supabase
            .channel(`subscription:${userId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_settings',
                filter: `user_id=eq.${userId}`
              },
              (payload) => {
                const updatedData = payload.new ? {
                  id: (payload.new as any).id,
                  user_id: (payload.new as any).user_id,
                  plan: (payload.new as any).subscription_plan || 'free',
                  status: (payload.new as any).subscription_status || 'active',
                  current_period_end: (payload.new as any).subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  stripe_customer_id: (payload.new as any).stripe_customer_id,
                  stripe_subscription_id: (payload.new as any).stripe_subscription_id,
                  cancel_at_period_end: (payload.new as any).cancel_at_period_end || false,
                  githubPushesThisMonth: (payload.new as any).github_pushes_this_month || 0,
                  deploymentsThisMonth: (payload.new as any).deployments_this_month || 0,
                  created_at: (payload.new as any).created_at,
                  updated_at: (payload.new as any).updated_at
                } : null

                if (updatedData) {
                  // Update cache
                  subscriptionCache = updatedData
                  cacheTimestamp = Date.now()

                  // Save to session storage
                  try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedData))
                    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, cacheTimestamp.toString())
                  } catch (error) {
                    // Silently fail - session storage errors are not critical
                  }

                  setSubscription(updatedData)
                }
              }
            )
            .subscribe()
        }

      } catch (error) {
        // Silently fail - subscription fetch errors are not critical
      } finally {
        isLoading = false
        setLoading(false)
      }
    }

    fetchSubscription()

    // Cleanup
    return () => {
      // Don't unsubscribe - keep it active for the session
    }
  }, [userId])

  return {
    subscription,
    loading,
    plan: subscription?.plan || 'free', // Plan names from user_settings: 'free', 'pro', 'teams', 'enterprise' (legacy), or 'creator', 'collaborate', 'scale' (new)
    status: subscription?.status || 'active',
    isPro: subscription?.plan === 'pro' || subscription?.plan === 'creator', // Pro/Creator plan ($15/mo, 50 credits)
    isTeams: subscription?.plan === 'teams' || subscription?.plan === 'collaborate', // Teams/Collaborate plan ($25/mo, 75 credits)
    isEnterprise: subscription?.plan === 'enterprise' || subscription?.plan === 'scale', // Enterprise/Scale plan ($60/mo, 150 credits)
    githubPushesThisMonth: subscription?.githubPushesThisMonth || 0,
    deploymentsThisMonth: subscription?.deploymentsThisMonth || 0
  }
}

// Utility to clear cache (for logout, etc.)
export function clearSubscriptionCache() {
  subscriptionCache = null
  cacheTimestamp = 0

  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CACHE_KEY)
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
    } catch (error) {
      // Silently fail - session storage errors are not critical
    }
  }
}

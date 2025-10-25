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
        console.log('[SubscriptionCache] Loaded from session storage, age:', Math.round(age / 1000), 's')
      }
    }
  } catch (error) {
    console.error('[SubscriptionCache] Error loading from session storage:', error)
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
      console.log('[SubscriptionCache] Using cached data, age:', Math.round(cacheAge / 1000), 's')
      setSubscription(subscriptionCache)
      setLoading(false)
      return
    }

    // Otherwise fetch fresh data
    const fetchSubscription = async () => {
      if (isLoading) {
        console.log('[SubscriptionCache] Already loading, waiting...')
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
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          console.error('[SubscriptionCache] Error fetching subscription:', error)
          isLoading = false
          setLoading(false)
          return
        }

        const subscriptionData = data || {
          id: '',
          user_id: userId,
          plan: 'free',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          githubPushesThisMonth: 0,
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
          console.error('[SubscriptionCache] Error saving to session storage:', error)
        }

        setSubscription(subscriptionData)
        console.log('[SubscriptionCache] Fetched fresh data, plan:', subscriptionData.plan)

        // Set up Realtime subscription (only once)
        if (!realtimeChannel) {
          console.log('[SubscriptionCache] Setting up Realtime subscription')
          realtimeChannel = supabase
            .channel(`subscription:${userId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'subscriptions',
                filter: `user_id=eq.${userId}`
              },
              (payload) => {
                console.log('[SubscriptionCache] Realtime update received:', payload)

                const updatedData = payload.new as SubscriptionData

                // Update cache
                subscriptionCache = updatedData
                cacheTimestamp = Date.now()

                // Save to session storage
                try {
                  sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedData))
                  sessionStorage.setItem(CACHE_TIMESTAMP_KEY, cacheTimestamp.toString())
                } catch (error) {
                  console.error('[SubscriptionCache] Error saving to session storage:', error)
                }

                setSubscription(updatedData)
              }
            )
            .subscribe((status) => {
              console.log('[SubscriptionCache] Realtime status:', status)
            })
        }

      } catch (error) {
        console.error('[SubscriptionCache] Unexpected error:', error)
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
    plan: subscription?.plan || 'free',
    status: subscription?.status || 'active',
    isPro: subscription?.plan === 'pro',
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
      console.error('[SubscriptionCache] Error clearing session storage:', error)
    }
  }

  console.log('[SubscriptionCache] Cache cleared')
}

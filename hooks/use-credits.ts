import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCreditStatus, CreditStatus } from '@/lib/credit-manager'

export function useCredits(userId?: string) {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchCreditStatus = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const status = await getCreditStatus(userId)
      setCreditStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credit status')
      console.error('Error fetching credit status:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshCredits = useCallback(() => {
    fetchCreditStatus()
  }, [fetchCreditStatus])

  useEffect(() => {
    if (userId) {
      fetchCreditStatus()
    }
  }, [userId, fetchCreditStatus])

  // Set up real-time subscription for credit updates
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`credit-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Credit status updated:', payload)
          // Refresh credit status when user_settings table changes
          fetchCreditStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchCreditStatus])

  return {
    creditStatus,
    loading,
    error,
    refreshCredits,
    // Helper computed values
    hasCredits: creditStatus ? creditStatus.remaining > 0 : false,
    isLowOnCredits: creditStatus ? creditStatus.status === 'low' : false,
    isOutOfCredits: creditStatus ? creditStatus.status === 'exhausted' : false,
    usagePercentage: creditStatus ?
      Math.round((creditStatus.used / creditStatus.limit) * 100) : 0
  }
}

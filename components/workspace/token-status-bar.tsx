"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Coins, Zap, TrendingDown, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface TokenStatusBarProps {
  userId: string
  userPlan: string
}

export function TokenStatusBar({ userId, userPlan }: TokenStatusBarProps) {
  const [credits, setCredits] = useState<number | null>(null)
  const [usedThisMonth, setUsedThisMonth] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const fetchWallet = useCallback(async () => {
    if (!userId) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("wallet")
        .select("credits_balance, credits_used_this_month")
        .eq("user_id", userId)
        .single()

      if (data) {
        setCredits(data.credits_balance ?? 0)
        setUsedThisMonth(data.credits_used_this_month ?? 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchWallet()
    // Poll every 15s for updates
    const interval = setInterval(fetchWallet, 15000)
    return () => clearInterval(interval)
  }, [fetchWallet])

  // Subscribe to realtime wallet changes
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`wallet-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchWallet()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchWallet])

  const bal = credits ?? 0
  const isLow = bal <= 10
  const isCritical = bal <= 3

  const balColor = isCritical
    ? "text-red-400"
    : isLow
    ? "text-yellow-400"
    : "text-emerald-400"

  const planLabel = userPlan.charAt(0).toUpperCase() + userPlan.slice(1)

  return (
    <div className="px-3 py-[3px] border-t border-gray-800/60 bg-gray-950/95 text-[11px] text-gray-500 flex-shrink-0 select-none z-50">
      <div className="flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Zap className="size-3 text-orange-400" />
            <span className="text-gray-400">{planLabel}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-1">
            <Coins className="size-3" />
            <span className={balColor}>
              {loading ? "..." : `${bal.toFixed(1)} credits`}
            </span>
            {isCritical && !loading && (
              <TrendingDown className="size-3 text-red-400 animate-pulse" />
            )}
          </span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-500">
            Used: {usedThisMonth.toFixed(1)} this month
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {(isLow || userPlan === "free") && (
            <Link
              href="/pricing"
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <ArrowUpRight className="size-3" />
              <span>Upgrade</span>
            </Link>
          )}
          <Link
            href="/workspace/usage"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            Usage Details
          </Link>
        </div>
      </div>
    </div>
  )
}

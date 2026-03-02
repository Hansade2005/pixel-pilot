"use client"

import { ShieldAlert, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface BlockedUserOverlayProps {
  reason?: string
}

export function BlockedUserOverlay({ reason }: BlockedUserOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-red-500/10">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="size-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-3">
          Account Suspended
        </h2>
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
          {reason || "Your account has been suspended. Please upgrade your plan to continue using the platform."}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-colors"
          >
            <ArrowUpRight className="size-4" />
            Upgrade Plan
          </Link>
          <Link
            href="mailto:support@pipilot.dev"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

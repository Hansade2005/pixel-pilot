"use client"

import React, { useEffect, useState } from 'react'
// Using a plain anchor tag for external link to avoid Next Link issues for external URLs
import { X } from 'lucide-react'

export default function BuiltOnBadge({ href = 'https://pipilot.dev' }: { href?: string }) {
  const [visible, setVisible] = useState<boolean>(true)
  const storageKey = 'pipilot-built-on-badge-hidden'

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'true') {
        setVisible(false)
      }
    } catch (e) {
      // ignore storage errors
      console.warn('Could not read localStorage for built-on badge: ', e)
    }
  }, [])

  const closeBadge = () => {
    try {
      localStorage.setItem(storageKey, 'true')
    } catch (e) {
      console.warn('Could not write localStorage for built-on badge: ', e)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative inline-flex items-center bg-gray-900 text-white rounded-full shadow-lg px-3 py-2 border border-white/10">
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
          <img
            src="/logo.png"
            alt="piPilot"
            className="w-5 h-5 rounded-full object-cover"
            width={20}
            height={20}
          />
          <span className="text-xs font-medium">Built on PiPilot</span>
        </a>

        <button
          aria-label="Close built on badge"
          className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-gray-800 border border-white/10 w-7 h-7 hover:bg-gray-700 focus:outline-none"
          onClick={closeBadge}
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}

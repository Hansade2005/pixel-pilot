'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ThinkingIndicatorProps {
  className?: string
  isStreaming?: boolean
}

export function ThinkingIndicator({ className, isStreaming = false }: ThinkingIndicatorProps) {
  const [dots, setDots] = useState('')

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isStreaming && (
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          Thinking
        </span>
      )}
      <span className="text-blue-500 font-mono text-lg min-w-[2rem] inline-block">
        {dots}
      </span>
    </div>
  )
}

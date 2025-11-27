'use client'

import React, { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code, ArrowRight, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContinueBackendCardProps {
  title?: string
  description?: string
  prompt?: string
  className?: string
  onContinue?: (prompt: string) => void
}

/**
 * Special rendering component for backend implementation continuation
 * Automatically triggers backend development session when rendered
 */
export function ContinueBackendCard({
  title = "Continue with Backend Implementation",
  description = "UI prototyping complete! Ready to implement the backend functionality.",
  prompt = "",
  className,
  onContinue
}: ContinueBackendCardProps) {

  // Automatically trigger continuation when component mounts (same as initial prompt submission)
  useEffect(() => {
    if (prompt && onContinue) {
      // Immediate submission like initial prompt - no delay needed
      onContinue(prompt)
    }
  }, [prompt, onContinue])

  return (
    <Card className={cn(
      "border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5",
      "dark:from-green-500/10 dark:to-blue-500/10",
      className
    )}>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <Code className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-foreground leading-tight">
              {title}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {description}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          {/* UI Complete */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 dark:bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] font-bold flex-shrink-0">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                UI Prototyping Complete
              </p>
              <p className="text-[10px] text-muted-foreground">
                Pixel-perfect components delivered
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-3 h-3 text-muted-foreground animate-pulse" />
          </div>

          {/* Backend Starting */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex-shrink-0 animate-pulse">
              <Zap className="w-2.5 h-2.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Starting Backend Implementation
              </p>
              <p className="text-[10px] text-muted-foreground">
                API routes, database, authentication...
              </p>
            </div>
          </div>
        </div>

        {/* Auto-continuation notice */}
        <div className="flex items-start gap-1.5 pt-2 border-t border-green-500/10">
          <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-1.5 h-1.5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Automatically continuing with backend development session...
          </p>
        </div>
      </div>
    </Card>
  )
}
'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Key, Link, ArrowRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupabaseConnectionCardProps {
  title?: string
  description?: string
  labels?: {
    connectAuth?: string
    manageProject?: string
  }
  className?: string
}

/**
 * Special rendering component for Supabase project connection
 * This is NOT a pill - it's a compact card with CTAs
 */
export function SupabaseConnectionCard({
  title = "Connect Your Supabase Project",
  description = "To continue, please connect your Supabase account and select a project.",
  labels = {},
  className
}: SupabaseConnectionCardProps) {
  const {
    connectAuth = "Connect Account",
    manageProject = "Select Project"
  } = labels

  return (
    <Card className={cn(
      "border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5",
      "dark:from-purple-500/10 dark:to-blue-500/10",
      className
    )}>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-white" />
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

        {/* Connection Steps */}
        <div className="space-y-2">
          {/* Step 1: Connect Account */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Connect via Auth0 or token
              </p>
            </div>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-purple-500 hover:bg-purple-600 text-white flex-shrink-0"
              onClick={() => {
                window.open('https://pipilot.dev/workspace/account', '_blank')
              }}
            >
              <Key className="w-3 h-3 mr-1" />
              {connectAuth}
              <ExternalLink className="w-2.5 h-2.5 ml-1" />
            </Button>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </div>

          {/* Step 2: Select Project */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                View and connect project
              </p>
            </div>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
              onClick={() => {
                window.open('https://pipilot.dev/workspace/management', '_blank')
              }}
            >
              <Link className="w-3 h-3 mr-1" />
              {manageProject}
              <ExternalLink className="w-2.5 h-2.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-1.5 pt-2 border-t border-purple-500/10">
          <div className="w-3 h-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Database className="w-1.5 h-1.5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Once connected, I can manage your database, run queries, and deploy changes.
          </p>
        </div>
      </div>
    </Card>
  )
}

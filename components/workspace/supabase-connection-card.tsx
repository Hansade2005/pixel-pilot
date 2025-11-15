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
 * This is NOT a pill - it's a full-width card with CTAs
 */
export function SupabaseConnectionCard({
  title = "Connect Your Supabase Project",
  description = "To continue, please connect your Supabase account and select a project.",
  labels = {},
  className
}: SupabaseConnectionCardProps) {
  const {
    connectAuth = "Connect Supabase Account",
    manageProject = "Select & Connect Project"
  } = labels

  return (
    <Card className={cn(
      "p-6 border-2 border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20",
      className
    )}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Connection Steps */}
          <div className="space-y-3">
            {/* Step 1: Connect Account */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Connect your account via Auth0 or manual token
                </p>
              </div>
              <Button
                size="sm"
                className="bg-purple-500 hover:bg-purple-600 text-white"
                onClick={() => {
                  window.open('https://pipilot.dev/workspace/account', '_blank')
                }}
              >
                <Key className="w-4 h-4 mr-2" />
                {connectAuth}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Step 2: Select Project */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  View and connect your Supabase project
                </p>
              </div>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  window.open('https://pipilot.dev/workspace/management', '_blank')
                }}
              >
                <Link className="w-4 h-4 mr-2" />
                {manageProject}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-purple-200/30 dark:border-purple-800/30">
            <div className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
            </div>
            <p>
              Once connected, I'll be able to help you manage your database schema, run queries, and deploy changes seamlessly.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

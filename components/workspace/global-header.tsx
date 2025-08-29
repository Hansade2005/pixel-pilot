"use client"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, Settings } from "lucide-react"
import React from 'react'
import { ModelSelector } from "@/components/ui/model-selector"
import { AiModeSelector, type AIMode } from "@/components/ui/ai-mode-selector"

interface GlobalHeaderProps {
  title?: string
  onBack?: () => void
  onSettings?: () => void
  showBackButton?: boolean
  showSettingsButton?: boolean
  selectedModel?: string
  onModelChange?: (model: string) => void
  aiMode?: AIMode
  onAiModeChange?: (mode: AIMode) => void
}

interface GlobalHeaderProps {
  title?: string
  onBack?: () => void
  onSettings?: () => void
  showBackButton?: boolean
  showSettingsButton?: boolean
}

export function GlobalHeader({ 
  title = "Workspace", 
  onBack, 
  onSettings,
  showBackButton = true,
  showSettingsButton = true,
  selectedModel,
  onModelChange,
  aiMode,
  onAiModeChange
}: GlobalHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/workspace')
    }
  }

  const handleSettings = () => {
    if (onSettings) {
      onSettings()
    } else {
      router.push('/workspace/account')
    }
  }

  // Don't show back button on main workspace page
  const shouldShowBackButton = showBackButton && pathname !== '/workspace'

  return (
    <div className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2 md:space-x-4">
        {shouldShowBackButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Logo variant="icon" size="sm" />
        <div className="max-w-[200px] md:max-w-md truncate">
          <h1 className="text-lg font-semibold text-card-foreground truncate">{title}</h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3">
        {onAiModeChange && aiMode && (
          <AiModeSelector
            selectedMode={aiMode}
            onModeChange={onAiModeChange}
            compact={true}
            className="hidden sm:flex"
          />
        )}
        {onModelChange && selectedModel && (
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            compact={true}
            className="min-w-[60px]"
          />
        )}
        {showSettingsButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSettings}
            className="p-2"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
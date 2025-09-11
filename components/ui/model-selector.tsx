 "use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, Lock, Crown } from 'lucide-react'
import { chatModels, type ChatModel, getModelById } from '@/lib/ai-models'
import { getLimits } from '@/lib/stripe-config'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  userPlan?: string
  subscriptionStatus?: string
  className?: string
  compact?: boolean
}

  // No visual badges/colors needed — keep data simple (provider groups and model names)

export function ModelSelector({
  selectedModel,
  onModelChange,
  userPlan = 'free',
  subscriptionStatus,
  className = '',
  compact = true
}: ModelSelectorProps) {
  // Default subscription status based on plan (matches admin page behavior)
  const effectiveStatus = subscriptionStatus || (userPlan === 'free' ? 'active' : 'inactive')
  const currentModel = getModelById(selectedModel)
  
  // Group models by provider for better organization
  const modelsByProvider = chatModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ChatModel[]>)

  // Determine allowed models based on subscription status and plan
  const userLimits = getLimits(userPlan)

  // ONLY Pro plan users with ACTIVE status can access all models
  // All other users (Free, inactive Pro, canceled, etc.) only get auto model
  const isProActive = userPlan === 'pro' && effectiveStatus === 'active'

  // If user has Pro plan with active status, allow all models
  // Otherwise, only allow auto model
  const allowedModels = isProActive
    ? userLimits.allowedModels || []
    : ['auto']

  // Helper function to check if model is allowed
  const isModelAllowed = (modelId: string) => allowedModels.includes(modelId)

  // Function to truncate text to 3 characters for all models
  const truncateModelName = (text: string | undefined) => {
    if (!text) return '';
    
    // For "auto" model, truncate to 3 chars but no ellipsis
    if (text.toLowerCase() === 'auto') {
      return text.length > 3 ? text.substring(0, 3) : text;
    }
    
    // For all other models, truncate to 3 characters with ellipsis
    return text.length > 3 ? text.substring(0, 3) + '...' : text;
  };

  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <Select value={selectedModel} onValueChange={onModelChange}>
          {/* Match AiModeSelector compact trigger: small height, tight padding, no border, rely on shared chevron */}
          <SelectTrigger className="h-6 px-2 min-w-[56px] border-0 bg-transparent text-xs shadow-none focus:ring-0 p-0">
            <div className="flex items-center justify-center">
              <SelectValue>
                <span className="font-medium text-sm leading-none">{truncateModelName(currentModel?.name || selectedModel)}</span>
              </SelectValue>
            </div>
          </SelectTrigger>

          <SelectContent align="start" className="w-[260px] bg-popover text-popover-foreground border">
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <div key={provider} className="py-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {provider}
                </div>
                {models.map((model) => {
                  const allowed = isModelAllowed(model.id)
                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={!allowed}
                      className={`text-sm px-3 py-1 ${!allowed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{model.name}</span>
                        {!allowed && <Lock className="h-3 w-3 text-muted-foreground ml-2" />}
                        {allowed && isProActive && (
                          <Crown className="h-3 w-3 text-yellow-500 ml-2" />
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Full-size selector for non-compact mode
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AI Model</span>
      </div>
      
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <SelectValue>
              <span className="font-medium">{truncateModelName(currentModel?.name || selectedModel)}</span>
            </SelectValue>
          </div>
        </SelectTrigger>
        
        <SelectContent className="w-[420px]">
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <div key={provider} className="py-2">
              <div className="px-3 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b">
                {provider}
              </div>
              {models.map((model) => {
                const allowed = isModelAllowed(model.id)
                return (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    disabled={!allowed}
                    className={`p-3 text-sm ${!allowed ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!allowed && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {allowed && isProActive && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
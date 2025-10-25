 "use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, Lock, Crown } from 'lucide-react'
import { chatModels, type ChatModel, getModelById } from '@/lib/ai-models'
import { getLimits } from '@/lib/stripe-config'

interface ModelSelectorProps {
  selectedModel?: string
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
  
  // Set default selected model based on plan
  const defaultSelectedModel: string = userPlan === 'pro' ? 'grok-code-fast-1' : 'qwen3-coder-free'
  const effectiveSelectedModel = selectedModel || defaultSelectedModel
  
  const currentModel = getModelById(effectiveSelectedModel)
  
  const displayNameMap = new Map<string, string>([
    ['grok-code-fast-1', 'PiPilot 4.5 Pro'],
    ['grok-3-mini', 'PiPilot 4 Flash'],
    ['pipilot-pro', 'PiPilot Pro'],
    ['pipilot-ultra', 'PiPilot Ultra'],
    // OpenRouter Advanced Models
    ['deepseek-v3.2-exp', 'PiPilot DeepSeek V3.2 Exp'],
    ['grok-4-fast-reasoning', 'PiPilot Grok 4 Fast'],
    ['qwen3-30b-thinking', 'PiPilot Qwen3 30B Think'],
    ['qwen3-coder', 'PiPilot Qwen3 Coder'],
    ['qwen3-coder-free', 'PiPilot Qwen3 Coder Free'],
    ['qwen3-coder-30b-instruct', 'PiPilot Qwen3 Coder 30B'],
    ['deepseek-r1t2-chimera-free', 'PiPilot DeepSeek Chimera Free'],
    ['qwen3-next-80b-thinking', 'PiPilot Qwen3 80B Think'],
    ['phi-4-multimodal', 'PiPilot Phi-4 Multimodal'],
    ['deepseek-chat-v3.1', 'PiPilot DeepSeek V3.1'],
    // Claude models
    ['claude-sonnet-4.5', 'PiPilot Claude Sonnet 4.5'],
    ['claude-sonnet-4', 'PiPilot Claude Sonnet 4'],
  ])
  
  const filteredModels = chatModels.filter(model => displayNameMap.has(model.id))
  
  // Group models by provider for better organization
  const modelsByProvider = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ChatModel[]>)

  // Determine allowed models based on subscription status and plan
  const userLimits = getLimits(userPlan)

  // Set specific allowed models per plan
  let allowedModels: string[]
  if (userPlan === 'free') {
    allowedModels = [
      'grok-3-mini',
      // Free tier OpenRouter models
      'qwen3-coder-free',
      'deepseek-r1t2-chimera-free'
    ];
  } else if (userPlan === 'pro' && effectiveStatus === 'active') {
    allowedModels = [
      'grok-code-fast-1', 
      'grok-3-mini', 
      'pipilot-pro', 
      'pipilot-ultra',
      // OpenRouter Advanced Models
      'deepseek-v3.2-exp',
      'grok-4-fast-reasoning',
      'qwen3-30b-thinking',
      'qwen3-coder',
      'qwen3-coder-free',
      'qwen3-coder-30b-instruct',
      'deepseek-r1t2-chimera-free',
      'qwen3-next-80b-thinking',
      'phi-4-multimodal',
      'deepseek-chat-v3.1',
      // Claude models
      'claude-sonnet-4.5',
      'claude-sonnet-4'
    ];
  } else {
    // Fallback for pro inactive or other cases
    allowedModels = userLimits.allowedModels || ['auto']
  }

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
        <Select value={effectiveSelectedModel} onValueChange={onModelChange}>
          {/* Match AiModeSelector compact trigger: small height, tight padding, no border, rely on shared chevron */}
          <SelectTrigger className="h-6 px-2 min-w-[56px] border-0 bg-transparent text-xs shadow-none focus:ring-0 p-0">
            <div className="flex items-center justify-center w-full">
              <SelectValue>
                <span className="font-medium text-sm leading-none text-center">{truncateModelName(displayNameMap.get(effectiveSelectedModel) || currentModel?.name || effectiveSelectedModel)}</span>
              </SelectValue>
            </div>
          </SelectTrigger>

          <SelectContent align="start" className="w-[260px] bg-popover text-popover-foreground border">
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <div key={provider} className="py-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  PiPilot
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
                        <span>{displayNameMap.get(model.id) || model.name}</span>
                        {!allowed && <Lock className="h-3 w-3 text-muted-foreground ml-2" />}
                        {allowed && (userPlan === 'pro' && effectiveStatus === 'active') && (
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
      
      <Select value={effectiveSelectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <SelectValue>
              <span className="font-medium">{truncateModelName(displayNameMap.get(effectiveSelectedModel) || currentModel?.name || effectiveSelectedModel)}</span>
            </SelectValue>
          </div>
        </SelectTrigger>
        
        <SelectContent className="w-[420px]">
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <div key={provider} className="py-2">
              <div className="px-3 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b">
                PiPilot
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
                        <div className="font-medium">{displayNameMap.get(model.id) || model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!allowed && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {allowed && (userPlan === 'pro' && effectiveStatus === 'active') && (
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
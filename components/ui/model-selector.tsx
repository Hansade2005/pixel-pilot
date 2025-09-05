 "use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot } from 'lucide-react'
import { chatModels, type ChatModel, getModelById } from '@/lib/ai-models'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  className?: string
  compact?: boolean
}

  // No visual badges/colors needed — keep data simple (provider groups and model names)

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  className = '', 
  compact = true 
}: ModelSelectorProps) {
  const currentModel = getModelById(selectedModel)
  
  // Group models by provider for better organization
  const modelsByProvider = chatModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ChatModel[]>)

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
                {models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="text-sm px-3 py-1"
                  >
                    {model.name}
                  </SelectItem>
                ))}
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
              {models.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="p-3 text-sm"
                >
                  {model.name}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
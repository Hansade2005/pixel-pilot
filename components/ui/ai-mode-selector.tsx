"use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Eye, Bot, MessageSquare, Wrench } from 'lucide-react'

export type AIMode = 'ask' | 'agent'

interface AIModeConfig {
  id: AIMode
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: {
    text: string
    className: string
  }
  capabilities: string[]
  restrictions: string[]
}

const aiModes: AIModeConfig[] = [
  {
    id: 'ask',
    name: 'Ask Mode',
    description: 'AI can explore codebase and answer questions but cannot modify files',
    icon: Eye,
    badge: {
      text: 'Read-Only',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    },
    capabilities: [
      'Read files and explore codebase',
      'Answer questions about code',
      'Provide explanations and documentation',
      'Analyze code structure and patterns',
      'Suggest improvements and best practices'
    ],
    restrictions: [
      'Cannot create new files',
      'Cannot modify existing files', 
      'Cannot delete files',
      'Cannot install packages or dependencies'
    ]
  },
  {
    id: 'agent',
    name: 'Agent Mode',
    description: 'AI has full access to all tools and can modify, create, and delete files',
    icon: Bot,
    badge: {
      text: 'Full Access',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    },
    capabilities: [
      'Full file system access (read/write/delete)',
      'Create and modify any files',
      'Install packages and dependencies',
      'Build complete applications',
      'Implement features and fix bugs',
      'Complete autonomous development'
    ],
    restrictions: []
  }
]

interface AiModeSelectorProps {
  selectedMode: AIMode
  onModeChange: (mode: AIMode) => void
  className?: string
  compact?: boolean
}

export function AiModeSelector({ 
  selectedMode, 
  onModeChange, 
  className = '', 
  compact = true 
}: AiModeSelectorProps) {
  const currentMode = aiModes.find(mode => mode.id === selectedMode)
  
  // Render a minimal compact selector in both compact and full modes.
  // The selector displays only simple text labels: 'Ask' and 'Agent'.
  return (
<div className={`flex items-center ${className}`}>
  <Select value={selectedMode} onValueChange={onModeChange}>
    <SelectTrigger className="h-6 px-2 min-w-[56px] border-0 bg-gray-800 text-xs text-white shadow-none focus:ring-0 p-0 rounded-md">
      <div className="flex items-center justify-center">
        <span className="font-medium text-sm leading-none">
          {selectedMode === 'agent' ? 'Agent' : 'Ask'}
        </span>
      </div>
    </SelectTrigger>

    <SelectContent 
      align="start" 
      className="w-28 bg-gray-800 text-white border border-gray-700 rounded-md"
    >
      <SelectItem value="ask" className="text-sm px-3 py-1">
        Ask
      </SelectItem>
      <SelectItem value="agent" className="text-sm px-3 py-1">
        Agent
      </SelectItem>
    </SelectContent>
  </Select>
</div>


  )
}

// Helper functions to get mode information
export function getModeConfig(mode: AIMode): AIModeConfig | undefined {
  return aiModes.find(m => m.id === mode)
}

export function getAllModes(): AIModeConfig[] {
  return aiModes
}

export function isReadOnlyMode(mode: AIMode): boolean {
  return mode === 'ask'
}

export function hasFileAccess(mode: AIMode): boolean {
  return mode === 'agent'
}
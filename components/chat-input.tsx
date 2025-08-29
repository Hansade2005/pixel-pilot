"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FilePlus, 
  ArrowUp, 
  Rocket, 
  Sparkles, 
  Wand2, 
  Zap,
  Lightbulb,
  Code,Plus,
  Palette,
  Globe,
  ShoppingCart,
  Users,
  BarChart3,
  Calendar,
  MessageSquare
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "react-toastify"

interface ChatInputProps {
  onAuthRequired: () => void
}

const promptSuggestions = [
  {
    text: "Build a modern landing page",
    icon: Globe,
    category: "Web"
  },
  {
    text: "Create a todo app with React",
    icon: Code,
    category: "App"
  },
  {
    text: "Design an e-commerce store",
    icon: ShoppingCart,
    category: "Commerce"
  },
  {
    text: "Build a portfolio website",
    icon: Palette,
    category: "Portfolio"
  },
  {
    text: "Create a dashboard with charts",
    icon: BarChart3,
    category: "Dashboard"
  },
  {
    text: "Design a chat application",
    icon: MessageSquare,
    category: "Communication"
  },
  {
    text: "Build a calendar app",
    icon: Calendar,
    category: "Productivity"
  },
  {
    text: "Create a social media platform",
    icon: Users,
    category: "Social"
  }
]

export function ChatInput({ onAuthRequired }: ChatInputProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Focus input when suggestions are clicked
  useEffect(() => {
    if (inputRef.current && prompt) {
      inputRef.current.focus()
    }
  }, [prompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) return
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in to create a project')
      return
    }

    setIsLoading(true)
    
    try {
      const projectName = `App from: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      console.log('🚀 Creating project with prompt:', prompt)
      console.log('📝 Project name:', projectName)
      
      // Client-side project creation
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const workspace = await storageManager.createWorkspace({
        name: projectName,
        description: prompt,
        userId: user.id,
        isPublic: false,
        isTemplate: false,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed',
        slug
      })
      // Apply template files
      const { TemplateService } = await import('@/lib/template-service')
      await TemplateService.applyViteReactTemplate(workspace.id)
      const files = await storageManager.getFiles(workspace.id)
      toast.success('Project created and saved to local storage!')
      // Redirect to workspace with the new project
      router.push(`/workspace?newProject=${workspace.id}&prompt=${encodeURIComponent(prompt)}`)
      
    } catch (error) {
      console.error('❌ Error creating project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-24">
        <div className="relative">
          <div className="relative z-10">
            <Rocket className="h-20 w-20 text-blue-500 animate-bounce" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-ping" />
          <div className="absolute inset-4 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full animate-pulse" />
        </div>
        
        <div className="text-center space-y-4 max-w-md">
          <div className="text-2xl font-semibold text-white animate-pulse">
            {loadingStep}
          </div>
          <div className="text-gray-400 text-base">
            Setting up your development environment...
          </div>
        </div>

        <div className="w-80 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out animate-pulse" />
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Powered by AI</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Main Input Card */}
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
             
                
                  
                  <div className="flex-1 min-w-0">
                    <div className="relative flex items-center w-full rounded-full bg-gray-800 bg-opacity-70 border border-gray-700 overflow-hidden">
                      <button type="button" className="p-3 text-gray-400 hover:text-white">
                        <Plus className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        ref={inputRef}
                        placeholder="Ask Pixel Builder to Build"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        className="flex-grow bg-transparent outline-none px-2 py-3 text-lg placeholder-gray-500"
                        disabled={isLoading}
                      />
                      <button 
                        type="submit" 
                        disabled={!prompt.trim() || isLoading}
                        className="p-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                
              
              
              {/* Helper text */}
              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>Press Enter to send</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Lightbulb className="h-3 w-3" />
                    <span>Shift + Enter for new line</span>
                  </span>
                </div>
                <div className="text-gray-500">
                  {prompt.length}/1000
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Prompt Suggestions */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Popular app ideas</h3>
          <p className="text-sm text-gray-500">Click any suggestion to get started</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {promptSuggestions.map((suggestion) => {
            const IconComponent = suggestion.icon
            return (
              <Button
                key={suggestion.text}
                variant="ghost"
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="h-auto p-4 bg-gray-800/30 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-gray-700/50 hover:border-gray-600/50 rounded-xl transition-all duration-200 group"
              >
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-700/50 group-hover:bg-gray-600/50 flex items-center justify-center transition-colors">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{suggestion.text}</div>
                    <Badge variant="secondary" className="text-xs bg-gray-700/50 text-gray-400">
                      {suggestion.category}
                    </Badge>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Features showcase */}
      <div className="text-center space-y-4 pt-8">
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">Powered by advanced AI • Instant preview • One-click deployment</span>
        </div>
      </div>
    </div>
  )
}


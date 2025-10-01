"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowUp,
  Plus,
  Image as ImageIcon,
  Zap,
  AlertTriangle,
  Crown,
  Square
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useSubscription } from "@/hooks/use-subscription"

interface ChatInputProps {
  onAuthRequired: () => void
  onProjectCreated?: (project: any) => void
}

interface PromptSuggestion {
  display: string
  prompt: string
}

export function ChatInput({ onAuthRequired, onProjectCreated }: ChatInputProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Subscription status hook
  const { subscription, loading: subscriptionLoading } = useSubscription()

  // Fetch prompt suggestions on component mount
  useEffect(() => {
    fetchPromptSuggestions()
  }, [])

  const fetchPromptSuggestions = async () => {
    try {
      const response = await fetch('/api/prompt-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 6 }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch prompt suggestions:', error)
      // Fallback suggestions
      setSuggestions([
        { display: "Landing page", prompt: "Create a modern landing page for my startup" },
        { display: "Portfolio site", prompt: "Build a portfolio website to showcase my work" },
        { display: "Restaurant menu", prompt: "Design a restaurant website with menu" },
        { display: "E-commerce store", prompt: "Make an e-commerce store for clothing" },
        { display: "Blog with dark mode", prompt: "Create a blog website with dark mode" },
        { display: "Business website", prompt: "Build a business website with contact forms" }
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) return

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      onAuthRequired()
      return
    }

    setIsGenerating(true)

    try {
      console.log('🚀 ChatInput: Generating project details with Pixtral for prompt:', prompt)
      
      // Generate project name and description using Pixtral
      const response = await fetch('/api/project-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate project suggestion')
      }

      const data = await response.json()

      if (data.success && data.suggestion) {
        console.log('🤖 Pixtral generated suggestion:', data.suggestion)
        
        // Create project immediately with generated details
        const projectName = data.suggestion.name
        const projectDescription = data.suggestion.description
        const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        
        console.log('📝 Creating project with name:', projectName)
        
        // Client-side project creation
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        const workspace = await storageManager.createWorkspace({
          name: projectName,
          description: projectDescription,
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
        
        toast.success('Project created and saved!')
        
        // Clear the input and redirect to workspace with the new project
        setPrompt("")
        router.push(`/workspace?newProject=${workspace.id}&prompt=${encodeURIComponent(prompt)}`)
      } else {
        throw new Error('Failed to generate project suggestion')
      }

    } catch (error) {
      console.error('❌ Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Chat Input */}
      <div className="relative">
        <div className="bg-gray-800/80 chat-input-container border border-gray-700/50 rounded-2xl p-4 shadow-2xl">
          {/* Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-gray-800/96 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20 border border-gray-700/50">
              <div className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-lg font-medium">PiPilot is working...</span>
              </div>
            </div>
          )}

          {/* Subscription Status Display */}
          {!subscriptionLoading && subscription && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-300">
                    {subscription.plan === 'pro' ? 'Unlimited prompts (Pro)' :
                     subscription.plan === 'enterprise' ? 'Unlimited prompts (Enterprise)' :
                     'Limited prompts (Free)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {subscription.plan === 'pro' ? (
                    <div className="flex items-center gap-1 text-purple-400">
                      <Crown className="h-3 w-3" />
                      <span className="text-xs">Pro</span>
                    </div>
                  ) : subscription.plan === 'enterprise' ? (
                    <div className="flex items-center gap-1 text-blue-400">
                      <Crown className="h-3 w-3" />
                      <span className="text-xs">Enterprise</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Crown className="h-3 w-3" />
                      <span className="text-xs">Free</span>
                        </div>
                  )}
                  <span className="text-xs text-gray-500 capitalize">
                    {subscription.plan} plan
                  </span>
                </div>
              </div>

              {/* Free plan limitations warning */}
              {subscription.plan === 'free' && (
                <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-sm text-blue-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                    <span>Free plan: Limited prompts and GitHub pushes. Upgrade for unlimited access!</span>
                        <Button
                          size="sm"
                          variant="outline"
                      className="ml-auto text-blue-300 border-blue-700/50 hover:bg-blue-900/30"
                          onClick={() => router.push('/pricing')}
                        >
                          Upgrade
                        </Button>
                      </div>
                    </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Field */}
            <div className="relative">
              <input
                type="text"
                ref={inputRef}
                placeholder={isGenerating ? "PiPilot is working..." : "Describe your app idea..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent outline-none text-lg text-white placeholder-gray-400 py-3 px-4"
                disabled={isGenerating}
              />
            </div>

            {/* Bottom Bar with Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
              {/* Left Side - Plus and Attach */}
              <div className="flex items-center space-x-3">
                <button 
                  type="button"
                  className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">Attach</span>
                </button>
              </div>

              {/* Right Side - Send Button */}
              <button 
                type="submit" 
                disabled={!prompt.trim() || isGenerating}
                className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                {isGenerating ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Suggestion Pills */}
      {suggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setPrompt(suggestion.prompt)}
              disabled={isGenerating}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-sm font-medium hover:bg-white/20 hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed max-w-xs truncate"
              title={suggestion.prompt}
            >
              {suggestion.display}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


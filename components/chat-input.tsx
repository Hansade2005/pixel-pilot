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
  Crown
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "react-toastify"
import { useCredits } from "@/hooks/use-credits"
import { calculateCredits } from "@/lib/credit-manager"

interface ChatInputProps {
  onAuthRequired: () => void
}

export function ChatInput({ onAuthRequired }: ChatInputProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Credit status hook
  const { creditStatus, loading: creditsLoading, isLowOnCredits, isOutOfCredits } = useCredits()

  // Calculate credits needed for current prompt
  const requiredCredits = prompt.trim() ? calculateCredits('chat_message', { message: prompt }) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) return
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      onAuthRequired()
      return
    }

    // Check credit status
    if (isOutOfCredits || (creditStatus && creditStatus.remaining < requiredCredits)) {
      toast.error(`Insufficient credits! You need ${requiredCredits} credits but only have ${creditStatus?.remaining || 0} remaining.`)
      router.push('/pricing')
      return
    }

    // Warn user about low credits
    if (isLowOnCredits) {
      toast.warning(`You have ${creditStatus?.remaining || 0} credits remaining. Consider upgrading your plan.`)
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
          {/* Credit Status Display */}
          {!creditsLoading && creditStatus && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">
                    {creditStatus.plan === 'admin' ? 'Unlimited credits' : `${creditStatus.remaining} credits remaining`}
                  </span>
                  {requiredCredits > 0 && creditStatus.plan !== 'admin' && (
                    <span className="text-xs text-gray-500">
                      ({requiredCredits} needed for this request)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {creditStatus.plan === 'admin' ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <Crown className="h-3 w-3" />
                      <span className="text-xs">Admin</span>
                    </div>
                  ) : (
                    <>
                      {isOutOfCredits && (
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs">No credits</span>
                        </div>
                      )}
                      {isLowOnCredits && !isOutOfCredits && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs">Low credits</span>
                        </div>
                      )}
                    </>
                  )}
                  <span className="text-xs text-gray-500 capitalize">
                    {creditStatus.plan} plan
                  </span>
                </div>
              </div>

              {/* Warning messages - only show for non-admin users */}
              {creditStatus.plan !== 'admin' && (
                <>
                  {isOutOfCredits && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>You're out of credits! Upgrade to continue using Pixel Pilot.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto text-red-300 border-red-700/50 hover:bg-red-900/30"
                          onClick={() => router.push('/pricing')}
                        >
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  )}

                  {isLowOnCredits && !isOutOfCredits && (
                    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-sm text-yellow-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>You're running low on credits. Consider upgrading your plan.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto text-yellow-300 border-yellow-700/50 hover:bg-yellow-900/30"
                          onClick={() => router.push('/pricing')}
                        >
                          View Plans
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Field */}
            <div className="relative">
              <input
                type="text"
                ref={inputRef}
                placeholder="Ask Pixel Pilot anything..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent outline-none text-lg text-white placeholder-gray-400 py-3 px-4"
                disabled={isLoading}
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
                disabled={!prompt.trim() || isLoading}
                className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


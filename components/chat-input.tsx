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
  Mic,
  MicOff,
  Square,
  Sparkles
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useSubscriptionCache } from "@/hooks/use-subscription-cache"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion"

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
  const [isEnhancing, setIsEnhancing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // User state
  const [user, setUser] = useState<any>(null)

  // Speech-to-text state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<'vite-react' | 'nextjs'>('vite-react')

  // URL attachment state
  const [attachedUrl, setAttachedUrl] = useState("")
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)

  // Fetch user on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error checking user:", error)
        setUser(null)
      }
    }
    checkUser()
  }, [supabase.auth])

  // Subscription status hook
  const { subscription, loading: subscriptionLoading } = useSubscriptionCache(user?.id)

  // Check if Web Speech API is supported
  const isWebSpeechSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

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
        body: JSON.stringify({ count: 15 }),
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

  // Prompt enhancement using Pixtral AI
  const handlePromptEnhancement = async () => {
    if (!prompt.trim() || isEnhancing || isGenerating) return

    setIsEnhancing(true)
    try {
      const response = await fetch('/api/prompt-enhancement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.enhancedPrompt) {
          setPrompt(data.enhancedPrompt)
          inputRef.current?.focus()
        }
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error)
    } finally {
      setIsEnhancing(false)
    }
  }

  // Speech-to-text handlers using Web Speech API (with Deepgram fallback)
  const startWebSpeechRecognition = () => {
    try {
      // @ts-ignore - Web Speech API types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      // Enhanced settings for real-time typing
      recognition.continuous = true
      recognition.interimResults = true // Enable instant real-time results
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1
      
      // Store the initial prompt value when starting
      const initialPrompt = prompt
      let lastFinalTranscript = ''
      let silenceTimer: NodeJS.Timeout | null = null
      
      recognition.onstart = () => {
        setIsRecording(true)
        lastFinalTranscript = ''
        toast.success("🎤 Listening...", {
          description: "Speak now. I'll stop automatically when you're done."
        })
      }
      
      recognition.onresult = (event: any) => {
        // Clear any existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }
        
        let interimTranscript = ''
        let finalTranscript = ''
        
        // Process all results for instant typing effect
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }
        
        // Combine final and interim for instant real-time typing
        const combinedText = (finalTranscript || lastFinalTranscript) + interimTranscript
        
        // Update final transcript tracker
        if (finalTranscript) {
          lastFinalTranscript = finalTranscript
        }
        
        // Instantly update the input field with real-time text
        if (combinedText.trim()) {
          const updatedPrompt = initialPrompt 
            ? `${initialPrompt} ${combinedText.trim()}` 
            : combinedText.trim()
          setPrompt(updatedPrompt)
        }
        
        // Auto-stop detection: Set timer to stop after 2 seconds of silence
        silenceTimer = setTimeout(() => {
          if (recognition && recognitionRef.current) {
            recognition.stop()
            toast.info("Recording stopped", {
              description: "Stopped due to silence detected"
            })
          }
        }, 2000) // 2 seconds of silence triggers auto-stop
      }
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        
        // Clear silence timer on error
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }
        
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          toast.error("❌ Microphone access denied", {
            description: "Please allow microphone access to use voice input"
          })
        } else if (event.error === 'no-speech') {
          toast.warning("⚠️ No speech detected", {
            description: "Please try speaking louder or closer to the microphone"
          })
        } else if (event.error === 'aborted') {
          // User manually stopped, don't show error
          console.log('Recognition aborted by user')
        } else {
          toast.error("Recognition error", {
            description: `Error: ${event.error}. Please try again.`
          })
        }
        setIsRecording(false)
      }
      
      recognition.onend = () => {
        // Clear any pending silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }
        
        // Only show success if we actually captured text
        if (lastFinalTranscript.trim()) {
          toast.success("✅ Speech recognized successfully", {
            description: "Your speech has been converted to text"
          })
        }
        
        setIsRecording(false)
        recognitionRef.current = null
      }
      
      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('Error starting Web Speech Recognition:', error)
      toast.error("Speech recognition not available", {
        description: "Your browser doesn't support speech recognition"
      })
    }
  }

  const startDeepgramRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeWithDeepgram(audioBlob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      toast.success("Recording started", {
        description: "Speak now... Click again to stop"
      })
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error("Recording failed", {
        description: "Could not access microphone. Please check permissions."
      })
    }
  }

  const stopDeepgramRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsTranscribing(true)
    }
  }

  const transcribeWithDeepgram = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1]

        // Send to Deepgram API
        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio: base64Audio }),
        })

        if (!response.ok) {
          throw new Error('Failed to transcribe audio')
        }

        const data = await response.json()

        if (data.success && data.text) {
          // Append transcribed text to input
          setPrompt(prev => prev ? `${prev} ${data.text}` : data.text)
          
          toast.success("Transcription complete", {
            description: "Your speech has been converted to text"
          })
        } else {
          throw new Error('No transcription received')
        }
      }

      reader.onerror = () => {
        throw new Error('Failed to read audio file')
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      toast.error("Transcription failed", {
        description: "Could not convert speech to text"
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleMicrophoneClick = () => {
    if (isRecording) {
      // Stop recording
      if (isWebSpeechSupported && recognitionRef.current) {
        recognitionRef.current.stop()
      } else {
        stopDeepgramRecording()
      }
    } else {
      // Start recording - use Web Speech API if available, otherwise use Deepgram
      if (isWebSpeechSupported) {
        startWebSpeechRecognition()
      } else {
        // Fallback to Deepgram for browsers without Web Speech API (like Firefox)
        console.log('Web Speech API not supported, using Deepgram fallback')
        toast.info("Using Deepgram", {
          description: "Your browser doesn't support Web Speech API"
        })
        startDeepgramRecording()
      }
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
          template: selectedTemplate,
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
        
        // Generate unique slug
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        const baseSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        let slug = baseSlug
        let counter = 1
        
        // Check if slug exists and append number if needed
        while (await storageManager.getWorkspaceBySlug(user.id, slug)) {
          slug = `${baseSlug}-${counter}`
          counter++
          
          // Prevent infinite loop
          if (counter > 100) {
            // Fallback to timestamp-based slug
            slug = `${baseSlug}-${Date.now()}`
            break
          }
        }
        
        console.log('📝 Creating project with name:', projectName, 'and slug:', slug)
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
        
        // Apply template files based on selection
        const { TemplateService } = await import('@/lib/template-service')
        if (selectedTemplate === 'nextjs') {
          await TemplateService.applyNextJSTemplate(workspace.id)
        } else {
          await TemplateService.applyViteReactTemplate(workspace.id)
        }
        
        // CRITICAL FIX: Wait for IndexedDB transactions to complete
        // This prevents file contamination from other projects
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify files were created correctly for this specific workspace
        const files = await storageManager.getFiles(workspace.id)
        console.log(`✅ Verified ${files.length} files created for workspace ${workspace.id}`)
        
        if (files.length === 0) {
          throw new Error('Template files were not created properly. Please try again.')
        }
        
        // ✅ CRITICAL: Create initial checkpoint RIGHT AFTER template application
        // This captures the CLEAN template state before any contamination can occur
        try {
          const { createCheckpoint } = await import('@/lib/checkpoint-utils')
          // Create a dummy message ID for the initial template checkpoint
          const initialCheckpointMessageId = `template-init-${workspace.id}`
          await createCheckpoint(workspace.id, initialCheckpointMessageId)
          console.log(`✅ Created initial template checkpoint for workspace ${workspace.id}`)
          
          // Store the checkpoint message ID so we can reference it later
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`initial-checkpoint-${workspace.id}`, initialCheckpointMessageId)
          }
        } catch (checkpointError) {
          console.error('Failed to create initial checkpoint:', checkpointError)
          // Don't fail the project creation if checkpoint fails
        }
        
        toast.success('Project created and saved!')
        
        // 🌐 CRITICAL FIX: Fetch URL content BEFORE storing prompt
        // This ensures the full prompt with website context is ready for auto-send
        let fullPrompt = prompt.trim()
        
        if (attachedUrl.trim()) {
          console.log('🌐 Fetching URL content before storing prompt:', attachedUrl)
          toast.loading('Fetching website content...', { id: 'url-fetch' })
          
          try {
            const response = await fetch('/api/redesign', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: attachedUrl.trim() })
            })
            
            if (response.ok) {
              const data = await response.json()
              
              if (data.ok && data.markdown) {
                console.log('✅ URL content fetched:', {
                  url: attachedUrl,
                  contentLength: data.markdown.length
                })
                
                // Append URL content to prompt
                fullPrompt = `${fullPrompt}\n\n=== WEBSITE CONTEXT ===\nURL: ${attachedUrl}\n\n${data.markdown}\n=== END WEBSITE CONTEXT ===`
                
                toast.success('Website content loaded!', { id: 'url-fetch' })
              } else {
                toast.error('Failed to fetch website content', { id: 'url-fetch' })
              }
            } else {
              toast.error('Failed to fetch website content', { id: 'url-fetch' })
            }
          } catch (error) {
            console.error('❌ Error fetching URL:', error)
            toast.error('Error loading website content', { id: 'url-fetch' })
          }
        }
        
        // Store the FULL prompt (with URL content if attached) in sessionStorage
        // This ensures the complete prompt is sent to the chat panel
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`initial-prompt-${workspace.id}`, fullPrompt)
          
          // CRITICAL FIX: Clear any cached project/file state to prevent contamination
          // This ensures the workspace loads with a clean slate
          sessionStorage.removeItem('lastSelectedProject')
          sessionStorage.removeItem('cachedFiles')
        }
        
        // Clear the input and redirect to workspace with the new project
        // No need to pass prompt in URL anymore - it's in sessionStorage
        setPrompt("")
        setAttachedUrl("") // Clear URL attachment
        router.push(`/workspace?newProject=${workspace.id}`)
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
      {/* Main Chat Input - Lovable Style */}
      <div className="relative">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-2 flex items-start">
          {/* Left side - Enhance button at extreme top left */}
          <div className="absolute -top-1 -left-1 z-10">
            <button 
              type="button"
              onClick={handlePromptEnhancement}
              disabled={!prompt.trim() || isEnhancing || isGenerating}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isEnhancing
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-purple-600/80 hover:to-blue-600/80 text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
              title="Enhance prompt with AI"
            >
              {isEnhancing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Plan badge spanning after enhance */}
          {!subscriptionLoading && subscription && (
            <div className="absolute -top-1 left-10 z-10 flex items-center gap-2">
              {subscription.plan === 'pro' ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  <span>Pro</span>
                </div>
              ) : subscription.plan === 'enterprise' ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  <span>Enterprise</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  <span>Free</span>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={inputRef}
            placeholder={isGenerating ? "PiPilot is working..." : "Ask PiPilot to create an app..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-transparent border-none focus:ring-0 resize-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 p-3 pt-4"
            rows={3}
            disabled={isGenerating}
          />

          <div className="flex flex-col justify-between items-center h-full ml-2">
            {/* Attachment Popover */}
            <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
              <PopoverTrigger asChild>
                <button className="bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-400 mb-auto hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 z-[70]" side="top" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowUrlDialog(true)
                      setShowAttachmentMenu(false)
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Send Button */}
            <button 
              type="submit" 
              disabled={!prompt.trim() || isGenerating}
              className="bg-gray-800 dark:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center text-white dark:text-gray-800 mt-2 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
            >
              {isGenerating ? (
                <Square className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* URL Dialog */}
        {showUrlDialog && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <input
                type="url"
                placeholder="Paste website URL here (e.g., https://example.com)"
                value={attachedUrl}
                onChange={(e) => setAttachedUrl(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowUrlDialog(false)
                  setAttachedUrl("")
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Cancel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {attachedUrl && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                URL attached: {attachedUrl}
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg font-medium">PiPilot is working...</span>
            </div>
          </div>
        )}
      </div>

      {/* Framework Template Selector and Mic - positioned below */}
      <div className="flex items-center justify-between mt-3 px-2">
        <div className="flex items-center space-x-3">
          {/* Mic Button */}
          <button 
            type="button"
            onClick={handleMicrophoneClick}
            disabled={isTranscribing || isGenerating}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                : isTranscribing
                ? 'bg-gray-600/50 cursor-wait'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice input"}
          >
            {isTranscribing ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Template Selector */}
          <Select
            value={selectedTemplate}
            onValueChange={(value: 'vite-react' | 'nextjs') => setSelectedTemplate(value)}
            disabled={isGenerating}
          >
            <SelectTrigger className="w-[140px] h-8 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="vite-react" className="text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-white">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span>Vite</span>
                </div>
              </SelectItem>
              <SelectItem value="nextjs" className="text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg">▲</span>
                  <span>Next.js</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Free plan limitations warning */}
        {!subscriptionLoading && subscription && subscription.plan === 'free' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
            Free plan: Limited prompts. <button onClick={() => router.push('/pricing')} className="text-blue-500 hover:underline">Upgrade</button>
          </div>
        )}
      </div>

      {/* Suggestion Pills */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <Suggestions>
            {suggestions.map((suggestion, index) => (
              <Suggestion
                key={index}
                suggestion={suggestion.display}
                onClick={(displayText) => setPrompt(suggestion.prompt)}
                disabled={isGenerating}
                title={suggestion.prompt}
              >
                {suggestion.display}
              </Suggestion>
            ))}
          </Suggestions>
        </div>
      )}
    </div>
  )
}


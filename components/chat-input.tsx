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
  const [isEnhancing, setIsEnhancing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Speech-to-text state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Subscription status hook
  const { subscription, loading: subscriptionLoading } = useSubscription()

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
        
        // Truncate prompt to first 20 characters to avoid URL too long errors
        const truncatedPrompt = prompt.length > 20 
          ? prompt.substring(0, 20).trim() + '...'
          : prompt.trim()
        
        // Clear the input and redirect to workspace with the new project
        setPrompt("")
        router.push(`/workspace?newProject=${workspace.id}&prompt=${encodeURIComponent(truncatedPrompt)}`)
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
              {/* Left Side - Mic */}
              <div className="flex items-center space-x-3">
                <button 
                  type="button"
                  onClick={handleMicrophoneClick}
                  disabled={isTranscribing || isGenerating}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                      : isTranscribing
                      ? 'bg-gray-600/50 cursor-wait'
                      : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white'
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
              </div>

              {/* Right Side - Enhance and Send Buttons */}
              <div className="flex items-center space-x-3">
                <button 
                  type="button"
                  onClick={handlePromptEnhancement}
                  disabled={!prompt.trim() || isEnhancing || isGenerating}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isEnhancing
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-700/50 hover:bg-gradient-to-r hover:from-purple-600/80 hover:to-blue-600/80 text-gray-400 hover:text-white'
                  }`}
                  title="Enhance prompt with AI"
                >
                  {isEnhancing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </button>
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


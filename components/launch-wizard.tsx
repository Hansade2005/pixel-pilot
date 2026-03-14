"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Users,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  Briefcase,
  Gamepad2,
  GraduationCap,
  Heart,
  Utensils,
  Plane,
  Music,
  Camera,
  Lightbulb,
  Check,
  Smartphone,
  Monitor,
  Globe,
  Database,
  CreditCard,
  Lock,
  Cloud,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LaunchWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (generatedPrompt: string, framework: string) => void
}

interface WizardAnswers {
  appType: string
  audience: string
  features: string[]
  platform: string
  hasBackend: string
  description: string
}

const APP_TYPES = [
  { id: "saas", label: "SaaS / Business Tool", icon: Briefcase, desc: "Dashboards, CRMs, analytics" },
  { id: "ecommerce", label: "E-Commerce / Store", icon: ShoppingCart, desc: "Products, cart, checkout" },
  { id: "social", label: "Social / Community", icon: Users, desc: "Feeds, profiles, messaging" },
  { id: "content", label: "Content / Blog", icon: MessageSquare, desc: "Articles, media, CMS" },
  { id: "portfolio", label: "Portfolio / Landing", icon: Camera, desc: "Showcase, marketing pages" },
  { id: "education", label: "Education / Learning", icon: GraduationCap, desc: "Courses, quizzes, LMS" },
  { id: "health", label: "Health / Fitness", icon: Heart, desc: "Tracking, wellness, medical" },
  { id: "entertainment", label: "Game / Entertainment", icon: Gamepad2, desc: "Games, media, fun tools" },
  { id: "productivity", label: "Productivity / Utility", icon: Zap, desc: "Tools, calculators, planners" },
  { id: "other", label: "Something Else", icon: Lightbulb, desc: "I'll describe it below" },
]

const AUDIENCE_OPTIONS = [
  { id: "consumers", label: "General consumers", desc: "Everyday users, B2C" },
  { id: "businesses", label: "Businesses / Teams", desc: "B2B, enterprise, SMBs" },
  { id: "developers", label: "Developers / Technical", desc: "APIs, dev tools, technical" },
  { id: "internal", label: "Internal / Personal", desc: "Just for me or my team" },
]

const FEATURE_OPTIONS = [
  { id: "auth", label: "User accounts & login", icon: Lock },
  { id: "database", label: "Database & data storage", icon: Database },
  { id: "payments", label: "Payments & billing", icon: CreditCard },
  { id: "api", label: "API integrations", icon: Cloud },
  { id: "realtime", label: "Real-time updates", icon: Zap },
  { id: "analytics", label: "Analytics & dashboards", icon: BarChart3 },
  { id: "file-upload", label: "File uploads & media", icon: Camera },
  { id: "notifications", label: "Notifications & alerts", icon: MessageSquare },
]

const PLATFORM_OPTIONS = [
  { id: "web", label: "Web App", icon: Monitor, desc: "Browser-based, responsive", framework: "vite-react" },
  { id: "fullstack", label: "Full-Stack Web", icon: Globe, desc: "Frontend + backend + SSR", framework: "nextjs" },
  { id: "mobile", label: "Mobile App", icon: Smartphone, desc: "iOS & Android native", framework: "expo" },
]

const TOTAL_STEPS = 5

export function LaunchWizard({ open, onOpenChange, onComplete }: LaunchWizardProps) {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [answers, setAnswers] = useState<WizardAnswers>({
    appType: "",
    audience: "",
    features: [],
    platform: "",
    hasBackend: "",
    description: "",
  })

  const handleReset = useCallback(() => {
    setStep(1)
    setAnswers({
      appType: "",
      audience: "",
      features: [],
      platform: "",
      hasBackend: "",
      description: "",
    })
    setIsGenerating(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(handleReset, 300)
  }, [onOpenChange, handleReset])

  const canProceed = () => {
    switch (step) {
      case 1: return !!answers.appType
      case 2: return !!answers.audience
      case 3: return answers.features.length > 0
      case 4: return !!answers.platform
      case 5: return answers.description.trim().length > 10
      default: return false
    }
  }

  const toggleFeature = (featureId: string) => {
    setAnswers(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }))
  }

  const generatePrompt = async () => {
    setIsGenerating(true)

    try {
      const appTypeLabel = APP_TYPES.find(t => t.id === answers.appType)?.label || answers.appType
      const audienceLabel = AUDIENCE_OPTIONS.find(a => a.id === answers.audience)?.desc || answers.audience
      const featureLabels = answers.features
        .map(f => FEATURE_OPTIONS.find(o => o.id === f)?.label)
        .filter(Boolean) as string[]
      const platformOption = PLATFORM_OPTIONS.find(p => p.id === answers.platform)
      const platformLabel = platformOption?.label || answers.platform
      const framework = platformOption?.framework || "vite-react"

      let generatedPrompt = ""

      try {
        // Use a0 LLM API for AI-powered prompt generation (free, no key needed)
        const response = await fetch("https://api.a0.dev/ai/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are PiPilot's Launch Wizard AI. Your job is to take a user's app idea and produce a comprehensive, actionable development prompt for an AI code generator. Output ONLY the prompt text, no preamble or explanation.

The prompt you generate should:
- Start with a clear one-line summary of what to build
- List all pages/screens needed with their key UI components
- Specify navigation structure and routing
- Detail each feature's behavior and data model
- Include design direction (modern, dark theme, responsive)
- Mention loading states, error handling, and edge cases
- Be specific about interactions (click, hover, submit flows)
- Reference the target framework and platform

Keep it concise but thorough - aim for a prompt that leaves no ambiguity for the AI builder.`
              },
              {
                role: "user",
                content: `Generate a detailed development prompt from these wizard answers:

App Type: ${appTypeLabel}
Target Audience: ${audienceLabel}
Platform: ${platformLabel} (${framework})
Key Features: ${featureLabels.join(", ")}

User's Description:
"${answers.description}"`
              }
            ]
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.completion) {
            generatedPrompt = data.completion.trim()
          }
        }
      } catch {
        // a0 API failed, fall back to manual prompt construction
      }

      if (!generatedPrompt) {
        generatedPrompt = buildFallbackPrompt(appTypeLabel, audienceLabel, featureLabels, platformLabel, answers.description)
      }

      onComplete(generatedPrompt, framework)
      handleClose()
    } catch (error) {
      console.error("Launch Wizard error:", error)
      const appTypeLabel = APP_TYPES.find(t => t.id === answers.appType)?.label || answers.appType
      const featureLabels = answers.features
        .map(f => FEATURE_OPTIONS.find(o => o.id === f)?.label)
        .filter(Boolean) as string[]
      const platformOption = PLATFORM_OPTIONS.find(p => p.id === answers.platform)
      const framework = platformOption?.framework || "vite-react"

      const fallback = buildFallbackPrompt(
        appTypeLabel,
        AUDIENCE_OPTIONS.find(a => a.id === answers.audience)?.desc || "",
        featureLabels,
        platformOption?.label || "",
        answers.description
      )
      onComplete(fallback, framework)
      handleClose()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else onOpenChange(true)
    }}>
      <DialogContent className="sm:max-w-[560px] bg-gray-950 border-gray-800 p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800/60">
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Plan Your App
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Answer a few questions and AI will craft the perfect prompt for you.
          </DialogDescription>
          {/* Progress bar */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  i + 1 <= step ? "bg-orange-500" : "bg-gray-800"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[55vh]">
          {/* Step 1: App Type */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-4">What kind of app are you building?</h3>
              <div className="grid grid-cols-2 gap-2">
                {APP_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = answers.appType === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => setAnswers(prev => ({ ...prev, appType: type.id }))}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "border-orange-500/50 bg-orange-600/10 ring-1 ring-orange-500/30"
                          : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        isSelected ? "bg-orange-600/20 text-orange-400" : "bg-gray-800 text-gray-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-sm font-medium", isSelected ? "text-white" : "text-gray-300")}>
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Target Audience */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Who is this app for?</h3>
              <div className="space-y-2">
                {AUDIENCE_OPTIONS.map((option) => {
                  const isSelected = answers.audience === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => setAnswers(prev => ({ ...prev, audience: option.id }))}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "border-orange-500/50 bg-orange-600/10 ring-1 ring-orange-500/30"
                          : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900"
                      )}
                    >
                      <div>
                        <div className={cn("text-sm font-medium", isSelected ? "text-white" : "text-gray-300")}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Key Features */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-1">What features do you need?</h3>
              <p className="text-xs text-gray-500 mb-4">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_OPTIONS.map((feature) => {
                  const Icon = feature.icon
                  const isSelected = answers.features.includes(feature.id)
                  return (
                    <button
                      key={feature.id}
                      onClick={() => toggleFeature(feature.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "border-orange-500/50 bg-orange-600/10 ring-1 ring-orange-500/30"
                          : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-500"
                      )}>
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={cn("text-sm", isSelected ? "text-white font-medium" : "text-gray-400")}>
                        {feature.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Platform */}
          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-4">What platform are you targeting?</h3>
              <div className="space-y-2">
                {PLATFORM_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = answers.platform === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => setAnswers(prev => ({ ...prev, platform: option.id }))}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "border-orange-500/50 bg-orange-600/10 ring-1 ring-orange-500/30"
                          : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-orange-600/20 text-orange-400" : "bg-gray-800 text-gray-500"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className={cn("text-sm font-medium", isSelected ? "text-white" : "text-gray-300")}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        isSelected ? "bg-orange-500/20 text-orange-300" : "bg-gray-800 text-gray-500"
                      )}>
                        {option.framework === "vite-react" ? "Vite" : option.framework === "nextjs" ? "Next.js" : "Expo"}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 5: Description */}
          {step === 5 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-1">Describe your app in more detail</h3>
              <p className="text-xs text-gray-500 mb-4">
                Tell us what makes your app unique. What should users be able to do? Any specific design preferences?
              </p>
              <textarea
                value={answers.description}
                onChange={(e) => setAnswers(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Example: A project management tool for small teams. Users can create projects, assign tasks with deadlines, track progress with kanban boards, and get daily email summaries. Clean, minimal design with a dark theme..."
                className="w-full min-h-[160px] max-h-[240px] resize-none rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs",
                  answers.description.trim().length > 10 ? "text-gray-500" : "text-orange-400"
                )}>
                  {answers.description.trim().length > 10
                    ? `${answers.description.trim().length} characters`
                    : "At least 10 characters needed"
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(s => s - 1)}
                disabled={isGenerating}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">
              {step} of {TOTAL_STEPS}
            </span>
            {step < TOTAL_STEPS ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={generatePrompt}
                disabled={!canProceed() || isGenerating}
                className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    AI is thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Generate with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function buildFallbackPrompt(
  appType: string,
  audience: string,
  features: string[],
  platform: string,
  description: string
): string {
  const featureList = features.length > 0
    ? `\n\nKey features to include:\n${features.map(f => `- ${f}`).join("\n")}`
    : ""

  return `Build a ${appType.toLowerCase()} (${platform}).

Target audience: ${audience}.
${featureList}

${description}

Requirements:
- Modern, professional UI with clean design and smooth animations
- Fully responsive layout (mobile, tablet, desktop)
- Well-organized component structure
- Use placeholder/sample data where needed
- Include proper navigation and routing
- Add loading states and error handling for all interactive elements`
}

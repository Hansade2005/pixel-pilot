'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ThinkingIndicatorProps {
  className?: string
  mode?: 'agent' | 'ask'
}

// Agent mode phases (for code changes and modifications)
const AGENT_PHASES = [
  {
    id: 'thinking',
    text: 'Thinking',
    duration: 3000,
    icon: '🧠',
    description: 'Analyzing your request and planning the approach...'
  },
  {
    id: 'thought',
    text: 'Thought',
    duration: 3000,
    icon: '💭',
    description: 'Processing the solution...'
  },
  {
    id: 'changes',
    text: 'Making changes to codebase',
    duration: 4000,
    icon: '⚡',
    description: 'Just a moment, implementing modifications...'
  },
  {
    id: 'optimizing',
    text: 'Optimizing implementation',
    duration: 3500,
    icon: '🔧',
    description: 'Fine-tuning the solution for better performance...'
  },
  {
    id: 'reviewing',
    text: 'Reviewing changes',
    duration: 3000,
    icon: '👀',
    description: 'Double-checking everything looks perfect...'
  },
  {
    id: 'testing',
    text: 'Running tests',
    duration: 3200,
    icon: '🧪',
    description: 'Ensuring everything works as expected...'
  },
  {
    id: 'finalizing',
    text: 'Finalizing response',
    duration: 2500,
    icon: '✨',
    description: 'Preparing the final output for you...'
  }
]

// Ask mode phases (for analysis and discussion only)
const ASK_PHASES = [
  {
    id: 'fetching',
    text: 'Fetching context',
    duration: 3000,
    icon: '📥',
    description: 'Loading project files and gathering relevant context...'
  },
  {
    id: 'analyzing',
    text: 'Analyzing project',
    duration: 4000,
    icon: '🔍',
    description: 'Examining code structure, patterns, and architecture...'
  },
  {
    id: 'processing',
    text: 'Processing insights',
    duration: 3500,
    icon: '🧠',
    description: 'Identifying issues, opportunities, and best practices...'
  },
  {
    id: 'structuring',
    text: 'Structuring analysis',
    duration: 3000,
    icon: '📋',
    description: 'Organizing findings into clear, actionable insights...'
  },
  {
    id: 'formatting',
    text: 'Formatting response',
    duration: 3500,
    icon: '✨',
    description: 'Crafting a beautifully structured response with clear explanations...'
  }
]

export function ThinkingIndicator({ className, mode = 'agent' }: ThinkingIndicatorProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [dots, setDots] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  // Select appropriate phases based on mode
  const PHASES = mode === 'ask' ? ASK_PHASES : AGENT_PHASES
  const currentPhase = PHASES[currentPhaseIndex]

  // Handle phase transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPhaseIndex((prev) => (prev + 1) % PHASES.length)
    }, currentPhase.duration)

    return () => clearTimeout(timer)
  }, [currentPhaseIndex, currentPhase.duration])

  // Handle typewriter dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Snake-like animation for the thinking and thought phases
  const SnakeAnimation = () => {
    if (currentPhase.id !== 'thinking' && currentPhase.id !== 'thought') return null

    const isThoughtPhase = currentPhase.id === 'thought'
    
    return (
      <div className="flex items-center justify-center gap-1 mb-3">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isThoughtPhase 
                ? "bg-gradient-to-r from-purple-400 to-pink-500"
                : "bg-gradient-to-r from-blue-400 to-purple-500",
              "animate-pulse"
            )}
            style={{
              animationDelay: `${i * 0.08}s`,
              animationDuration: '1.2s',
              opacity: Math.sin((i / 12) * Math.PI) * 0.8 + 0.2
            }}
          />
        ))}
      </div>
    )
  }

  // Progress bar animation
  const ProgressBar = () => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3 overflow-hidden glow-effect">
      <div 
        className="h-1.5 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${((currentPhaseIndex + 1) / PHASES.length) * 100}%`,
          animation: 'shimmer 2s infinite',
          backgroundImage: 'linear-gradient(90deg, #4ade80, #3b82f6, #8b5cf6)',
          backgroundSize: '200% 100%'
        }}
      />
    </div>
  )

  // Pulse animation for icons
  const AnimatedIcon = () => (
    <div className="relative">
      <span 
        className="text-2xl inline-block transition-all duration-500 ease-in-out"
        style={{
          animation: 'bounce 2s infinite'
        }}
      >
        {currentPhase.icon}
      </span>
      <div 
        className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping"
        style={{ animationDuration: '2s' }}
      />
    </div>
  )

  return (
    <div className={cn("space-y-3 p-4", className)}>
      <style jsx>{`
        @keyframes shimmer {
          0% { 
            background-position: -200% 0;
            background-size: 200% 100%;
          }
          100% { 
            background-position: 200% 0;
            background-size: 200% 100%;
          }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-8px) scale(1.1); }
          60% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }
          50% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3);
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        .glow-effect {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Snake animation for thinking phase */}
      <SnakeAnimation />

      {/* Progress bar */}
      <ProgressBar />

      {/* Main content */}
      <div className="flex items-center gap-3 fade-in-up">
        <AnimatedIcon />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {currentPhase.text}
            </span>
            <span className="text-blue-500 font-mono text-lg min-w-[2rem] inline-block">
              {dots}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentPhase.description}
          </p>
        </div>
      </div>

      {/* Phase indicator dots */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {PHASES.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentPhaseIndex
                ? "bg-blue-500 scale-125"
                : index < currentPhaseIndex
                ? "bg-green-500"
                : "bg-gray-300 dark:bg-gray-600"
            )}
          />
        ))}
      </div>
    </div>
  )
}

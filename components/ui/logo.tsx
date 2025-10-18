import { cn } from '@/lib/utils'
import { Sparkles, Code, Zap, Rocket, Cpu, Layers } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'text' | 'full'
  className?: string
}

export function Logo({ size = 'md', variant = 'icon', className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  // Enhanced Pipilot Icon Component
  const PipilotIcon = ({ className }: { className?: string }) => (
    <div className={cn('relative group', className)}>
      {/* Main container with gradient background */}
      <div className="relative w-full h-full">
        {/* Primary gradient background */}
        <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-2xl overflow-hidden">
          
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-indigo-400/30 animate-pulse" />
          
          {/* Pixel grid pattern overlay */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
              <defs>
                <pattern id="pixelGrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.4"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#pixelGrid)" />
            </svg>
          </div>
          
          {/* Central icon container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Main rocket icon */}
            <div className="relative">
              <Rocket className="w-1/2 h-1/2 text-white drop-shadow-lg" />
              
              {/* Glowing effect behind rocket */}
              <div className="absolute inset-0 w-1/2 h-1/2 bg-white/20 rounded-full blur-sm animate-pulse" />
            </div>
          </div>
          
          {/* Corner sparkle effects */}
          <div className="absolute top-1 left-1 animate-bounce">
            <Sparkles className="w-2 h-2 text-yellow-300 drop-shadow-sm" />
          </div>
          <div className="absolute bottom-1 right-1 animate-bounce" style={{ animationDelay: '0.5s' }}>
            <Zap className="w-2 h-2 text-cyan-300 drop-shadow-sm" />
          </div>
          <div className="absolute top-1 right-1 animate-bounce" style={{ animationDelay: '1s' }}>
            <Cpu className="w-2 h-2 text-green-300 drop-shadow-sm" />
          </div>
          <div className="absolute bottom-1 left-1 animate-bounce" style={{ animationDelay: '1.5s' }}>
            <Layers className="w-2 h-2 text-pink-300 drop-shadow-sm" />
          </div>
        </div>
        
        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-indigo-400/30 rounded-xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300" />
        
        {/* Hover animation overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 via-purple-400/0 to-indigo-400/0 rounded-xl group-hover:from-blue-400/20 group-hover:via-purple-400/20 group-hover:to-indigo-400/20 transition-all duration-300" />
      </div>
    </div>
  )

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <PipilotIcon className={sizeClasses[size]} />
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <PipilotIcon className="h-6 w-6" />
        <div className="flex flex-col">
          <span className={cn('font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent', textSizes[size])}>
            PiPilot
          </span>
          <span className={cn('text-gray-300 font-medium text-xs', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-sm')}>
            Plan,build & ship faster.
          </span>
        </div>
      </div>
    )
  }

  // Full variant with larger logo and text
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <PipilotIcon className={size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : size === 'lg' ? 'h-16 w-16' : 'h-20 w-20'} />
      <div className="flex flex-col">
        <span className={cn('font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent', textSizes[size])}>
          Pipilot
        </span>
        <span className={cn('text-gray-300 font-medium', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg')}>
          AI-Powered App Development
        </span>
      </div>
    </div>
  )
}

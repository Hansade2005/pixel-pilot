import Image from 'next/image'
import { cn } from '@/lib/utils'

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

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Image
          src="/logo.svg"
          alt="Pixel Builder"
          width={48}
          height={48}
          className={cn('object-contain', sizeClasses[size])}
        />
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Image
          src="/logo.svg"
          alt="Pixel Builder"
          width={32}
          height={32}
          className="h-6 w-6 object-contain"
        />
        <span className={cn('font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent', textSizes[size])}>
          Pixel Builder
        </span>
      </div>
    )
  }

  // Full variant with larger logo and text
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <Image
        src="/logo-large.svg"
        alt="Pixel Builder"
        width={120}
        height={120}
        className={cn('object-contain', size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : size === 'lg' ? 'h-16 w-16' : 'h-20 w-20')}
      />
      <div className="flex flex-col">
        <span className={cn('font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent', textSizes[size])}>
          Pixel Builder
        </span>
        <span className={cn('text-gray-400 font-medium', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg')}>
          AI-Powered App Development
        </span>
      </div>
    </div>
  )
}

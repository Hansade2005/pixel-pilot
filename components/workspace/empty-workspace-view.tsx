"use client"

import { useState, useEffect } from 'react'
import { ChatInput } from '@/components/chat-input'
import { Button } from '@/components/ui/button'
import { ArrowUp, Star, Sparkles } from 'lucide-react'
import type { Workspace } from '@/lib/storage-manager'

interface EmptyWorkspaceViewProps {
  onProjectCreated?: (project: Workspace) => void
  onAuthRequired: () => void
  recentProjects?: Array<{
    id: string
    name: string
    description?: string
    lastActivity: string
  }>
}

export function EmptyWorkspaceView({ 
  onProjectCreated, 
  onAuthRequired,
  recentProjects = []
}: EmptyWorkspaceViewProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'recently' | 'projects'>('recently')

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hero Section with Gradient */}
      <div
        className={`relative flex-1 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 pt-16 lg:pt-0 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60"></div>

        <div className="relative z-10 w-full max-w-4xl">
          {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-8 sm:mb-12 tracking-tight leading-tight px-2 sm:px-4 whitespace-nowrap overflow-x-auto">
              Ready to build something amazing?
              <span className="block text-xs sm:text-sm text-pink-300 mt-2 font-normal whitespace-normal">Let PiPilot create your next web app in seconds.</span>
            </h1>

          {/* Chat Input Component */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <ChatInput
              onAuthRequired={onAuthRequired}
              onProjectCreated={onProjectCreated}
            />
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-gray-900 px-4 sm:px-6 py-4 sm:py-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setActiveTab('recently')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'recently' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Recently viewed
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'projects' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                My projects
              </button>
            </div>

            <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">
              <span>Browse all</span>
              <ArrowUp size={14} className="rotate-45 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Empty State for Projects */}
          {recentProjects.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Placeholder cards */}
              <div className="bg-gray-800/50 rounded-xl h-40 sm:h-48 flex items-center justify-center border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="text-center p-4">
                  <Sparkles className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No projects yet</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl h-40 sm:h-48 hidden sm:flex items-center justify-center border border-gray-700/50"></div>
              <div className="bg-gray-800/50 rounded-xl h-40 sm:h-48 hidden lg:flex items-center justify-center border border-gray-700/50"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recentProjects.slice(0, 3).map((project) => (
                <div 
                  key={project.id}
                  className="bg-gray-800 rounded-xl h-40 sm:h-48 p-4 flex flex-col justify-between hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-gray-400">
                        {new Date(project.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-gray-400 text-xs line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Image as ImageIcon,
  Gift,
  Bell,
  Eye,
  Heart,
  ChevronDown,
  ExternalLink,
  Users,
  Download,
  Database,
  Building2,
  Server,
  Workflow,
  Figma
} from "lucide-react"
import Link from "next/link"
import { ChatInput } from "@/components/chat-input"
import { AuthModal } from "@/components/auth-modal"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import FeatureShowcase from "@/components/FeatureShowcase"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt"
import { OfflineIndicator } from "@/components/offline-indicator"

import { createClient } from "@/lib/supabase/client"
import { TemplateManager } from "@/lib/template-manager"
import { toast } from "sonner"

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<string>('popular')
  const [filterBy, setFilterBy] = useState<string>('all')
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const badgeItems = [
    { icon: <Database className="w-4 h-4 text-blue-400" />, text: "Introducing PiPilot DB 🎉" },
    { icon: <Building2 className="w-4 h-4 text-purple-400" />, text: "PiPilot Enterprise now live 🚀" },
    { icon: <Users className="w-4 h-4 text-green-400" />, text: "PiPilot Teams Coming soon 🎉" },
    { icon: <Server className="w-4 h-4 text-orange-400" />, text: "PiPilot DB MCP Server Coming soon 🚀" },
    { icon: <Workflow className="w-4 h-4 text-indigo-400" />, text: "Teams Workspace Coming soon 🎉" },
    { icon: <Figma className="w-4 h-4 text-pink-400" />, text: "Figma Import Coming soon 🚀" }
  ]

  useEffect(() => {
    checkUser()
    loadTemplates()

    // Badge rotation effect
    const badgeInterval = setInterval(() => {
      setCurrentBadgeIndex((prev) => (prev + 1) % badgeItems.length)
    }, 5000) // Change every 3 seconds

    return () => clearInterval(badgeInterval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.relative.group')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const loadTemplates = () => {
    const templateData = TemplateManager.getAllTemplates()
    setTemplates(templateData)
  }

  const handleDownloadTemplate = async (templateId: string) => {
    try {
      const { TemplateDownloader } = await import('@/lib/template-manager')
      await TemplateDownloader.downloadTemplateAsZip(templateId)
      toast.success('Template ZIP download has begun!')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Failed to download template. Please try again.')
    }
  }


  const checkUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthRequired = () => {
    setShowAuthModal(true)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    checkUser()
  }

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleFilterSelect = (filter: string) => {
    setFilterBy(filter)
    setIsDropdownOpen(false)
  }

  // Function to filter and sort templates
  const getFilteredAndSortedTemplates = () => {
    let filtered = templates

    // Apply category filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(template => {
        const category = template.category?.toLowerCase()
        switch (filterBy) {
          case 'discover':
            return category?.includes('consumer') || category?.includes('website') || category?.includes('personal')
          case 'internal':
            return category?.includes('internal') || category?.includes('tools') || category?.includes('prototype')
          case 'website':
            return category?.includes('website')
          case 'personal':
            return category?.includes('personal') || category?.includes('consumer')
          case 'consumer':
            return category?.includes('consumer')
          case 'b2b':
            return category?.includes('b2b') || category?.includes('saas')
          case 'prototype':
            return category?.includes('prototype')
          default:
            return category === filterBy.toLowerCase()
        }
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.remixes || 0) - (a.remixes || 0)
        case 'recent':
          // Use createdAt if available, otherwise fall back to current date for sorting stability
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : Date.now() - (a.remixes || 0) * 1000
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : Date.now() - (b.remixes || 0) * 1000
          return bDate - aDate
        case 'trending':
          // For trending, sort by combination of recency and popularity
          const aScore = (a.remixes || 0) * 0.7 + (new Date(a.createdAt || Date.now()).getTime() / (1000 * 60 * 60 * 24)) * 0.3
          const bScore = (b.remixes || 0) * 0.7 + (new Date(b.createdAt || Date.now()).getTime() / (1000 * 60 * 60 * 24)) * 0.3
          return bScore - aScore
        default:
          return 0
      }
    })

    return sorted
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 pt-16">
       

        {/* Hero Section */}
        <div className="text-center mb-16">
           {/* Dynamic Badge */}
        <div className="mb-6 animate-fade-in">
          <Badge className="bg-transparent backdrop-blur-[32px] text-white border border-white/20 px-6 py-3 text-sm font-semibold rounded-full shadow-lg relative overflow-hidden hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center gap-2">
              {badgeItems[currentBadgeIndex].icon}
              <span
                className="inline-block transition-opacity duration-500 ease-in-out opacity-100"
                key={currentBadgeIndex}
              >
                {badgeItems[currentBadgeIndex].text}
              </span>
            </div>
          </Badge>
        </div>
          <h1 className="mb-2 flex items-center justify-center gap-1 text-xl font-medium leading-none text-white sm:text-2xl md:mb-2.5 md:gap-0 md:text-5xl">
            <span className="pt-0.5 tracking-tight md:pt-0">Build something</span>
            <div className="flex flex-col gap-1 ml-1.5 sm:ml-2 md:ml-4 mr-1.5 sm:mr-2 md:mr-4">
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-10 md:h-10 rounded-full heart-gradient flex items-center justify-center">
                <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-5 md:h-5 text-white fill-current" />
              </div>
            </div>
            <span className="pt-0.5 tracking-tight md:pt-0"> Amazing</span>
          </h1>
          <p className="mb-6 text-center text-lg leading-tight text-white/65 md:text-xl">
            Create apps and websites by chatting with AI
          </p>
          
          {/* Product Hunt Badge */}
          <div className="flex justify-center mb-8">
            <a href="https://www.producthunt.com/products/pipilot?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-pipilot" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1040549&theme=light&t=1763663329258" alt="PiPilot - Build full apps and websites just by chatting with AI. | Product Hunt" style={{width: '250px', height: '54px'}} width="250" height="54" />
            </a>
          </div>
        </div>

        {/* Chat Input Section */}
        <div className="w-full max-w-4xl mx-auto">
          <ChatInput onAuthRequired={handleAuthRequired} />
        </div>
      </main>

      {/* Feature Showcase Section */}
      <FeatureShowcase />

      {/* From Pixel Community Section */}
      <section className="relative z-10 py-24 bg-gray-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                From Pixel Community
              </h2>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Dropdown */}
              <div className="relative group">
                <Button 
                  variant="outline" 
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'all' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={handleDropdownToggle}
                >
                  {filterBy === 'all' ? 'View All' :
                   filterBy === 'discover' ? 'Discover' :
                   filterBy === 'internal' ? 'Internal Tools' :
                   filterBy === 'website' ? 'Website' :
                   filterBy === 'personal' ? 'Personal' :
                   filterBy === 'consumer' ? 'Consumer App' :
                   filterBy === 'b2b' ? 'B2B App' :
                   filterBy === 'prototype' ? 'Prototype' : 'View All'}
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                {/* Dropdown Menu */}
                <div className={`absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg transition-all duration-200 z-10 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'} group-hover:opacity-100 group-hover:visible`}>
                  <div className="py-2">
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'all' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('all')}
                    >
                      View All
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'discover' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('discover')}
                    >
                      Discover
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'internal' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('internal')}
                    >
                      Internal Tools
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'website' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('website')}
                    >
                      Website
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'personal' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('personal')}
                    >
                      Personal
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'consumer' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('consumer')}
                    >
                      Consumer App
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'b2b' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('b2b')}
                    >
                      B2B App
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${filterBy === 'prototype' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => handleFilterSelect('prototype')}
                    >
                      Prototype
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getFilteredAndSortedTemplates().map((template, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 group"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg relative overflow-hidden">
                  <img
                    src={template.thumbnailUrl}
                    alt={template.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to gradient if image fails to load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {/* Project Preview Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30"
                        onClick={() => router.push(`/templates/${template.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Template
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30"
                        onClick={() => handleDownloadTemplate(template.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download ZIP
                      </Button>
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-gray-800/80 text-white border-gray-600">
                      {template.category}
                    </Badge>
                  </div>
                  
                  {/* Remixes Count */}
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-white text-sm font-medium">
                        {template.remixes.toLocaleString()} Remixes
                      </span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={template.authorAvatar}
                      alt={template.author}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        // Fallback to placeholder if avatar fails to load
                        e.currentTarget.src = '/placeholder-user.jpg'
                      }}
                    />
                    <span className="text-gray-400 text-sm">{template.author}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-1">
                    {template.title}
                  </h3>
                  <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                    {template.description}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-gray-600 text-white hover:bg-gray-700"
                      onClick={() => router.push(`/templates/${template.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`)}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      View Template
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleDownloadTemplate(template.id)}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* PWA Components */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <OfflineIndicator />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  )
}

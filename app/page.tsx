"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Plus,
  Image as ImageIcon,
  Gift,
  Bell,
  Eye,
  Heart,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  Download,
  Database,
  Building2,
  Server,
  Workflow,
  Figma,
  Wand2,
  MousePointer2
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
import { ProjectGrid } from "@/components/project-grid"

import { createClient } from "@/lib/supabase/client"
import { TemplateManager } from "@/lib/template-manager"
import { toast } from "sonner"
import { storageManager } from "@/lib/storage-manager"

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<string>('popular')
  const [filterBy, setFilterBy] = useState<string>('all')
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [currentTemplatePage, setCurrentTemplatePage] = useState(1)
  const templatesPerPage = 8

  const badgeItems = [
    { icon: <Wand2 className="w-4 h-4 text-cyan-400" />, text: "Visual Editor Now Live! 🎨" },
    { icon: <Database className="w-4 h-4 text-blue-400" />, text: "Introducing PiPilot DB 🎉" },
    { icon: <Building2 className="w-4 h-4 text-purple-400" />, text: "PiPilot Enterprise now live 🚀" },
    { icon: <Users className="w-4 h-4 text-green-400" />, text: "PiPilot Teams Coming soon 🎉" },
    { icon: <Server className="w-4 h-4 text-orange-400" />, text: "PiPilot DB MCP Server Now Live! 🚀" },
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

  const handleStartFromTemplate = async (template: any) => {
    try {
      // Check if user is authenticated
      if (!user) {
        setShowAuthModal(true)
        toast.error('Please sign in to create a workspace from template')
        return
      }

      toast.loading('Creating workspace from template...', { id: 'template-import' })

      // Initialize storage manager
      await storageManager.init()

      // Generate project name and description (same pattern as GitHub import)
      const projectName = template.title
      const projectDescription = `Created from template: ${template.title}`

      // Generate unique slug (same pattern as GitHub import)
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

      // Create workspace (same pattern as GitHub import - no id specified)
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

      // Apply template files to workspace
      const { TemplateManager } = await import('@/lib/template-manager')
      await TemplateManager.applyTemplate(template.id, workspace.id)

      // Create initial checkpoint (same pattern as GitHub import)
      try {
        const { createCheckpoint } = await import('@/lib/checkpoint-utils')
        const initialCheckpointMessageId = `template-import-${workspace.id}`
        await createCheckpoint(workspace.id, initialCheckpointMessageId)
        console.log(`✅ Created initial template import checkpoint for workspace ${workspace.id}`)

        // Store the checkpoint message ID
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`initial-checkpoint-${workspace.id}`, initialCheckpointMessageId)
        }
      } catch (checkpointError) {
        console.error('Failed to create initial checkpoint:', checkpointError)
      }

      // Store import info in sessionStorage (same pattern as GitHub import)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`initial-prompt-${workspace.id}`, `Created from template: ${template.title}`)
        sessionStorage.removeItem('lastSelectedProject')
        sessionStorage.removeItem('cachedFiles')
      }

      toast.success('Workspace created successfully!', { id: 'template-import' })

      // Navigate to the new workspace
      router.push(`/workspace?projectId=${workspace.id}`)
    } catch (error) {
      console.error('Error creating workspace from template:', error)
      toast.error('Failed to create workspace. Please try again.', { id: 'template-import' })
    }
  }


  const checkUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Also fetch user profile for personalized titles
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
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
    setCurrentTemplatePage(1) // Reset to first page when filter changes
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

  // Get paginated templates
  const allFilteredTemplates = getFilteredAndSortedTemplates()
  const totalTemplatePages = Math.ceil(allFilteredTemplates.length / templatesPerPage)
  const templateStartIndex = (currentTemplatePage - 1) * templatesPerPage
  const displayedTemplates = allFilteredTemplates.slice(templateStartIndex, templateStartIndex + templatesPerPage)

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
          
          {/* Product Hunt Badge & Visual Editor Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="https://www.producthunt.com/products/pipilot?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-pipilot" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1040549&theme=light&t=1763663329258" alt="PiPilot - Build full apps and websites just by chatting with AI. | Product Hunt" style={{width: '250px', height: '54px'}} width="250" height="54" />
            </a>
            
            {/* Visual Editor Vibe Card Button */}
            <Link 
              href="/features/visual-editor"
              className="group relative flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 hover:border-cyan-400/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 shadow-lg">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  Visual Editor
                </span>
                <span className="text-xs text-white/60">
                  Now Live 🎨
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              
              {/* Animated glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            </Link>
          </div>
        </div>

        {/* Chat Input Section */}
        <div className="w-full max-w-4xl mx-auto">
          <ChatInput onAuthRequired={handleAuthRequired} />
        </div>
      </main>

      {/* Projects Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto mb-16">
        <ProjectGrid userProfile={userProfile} />
      </div>

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
               Template Library
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
            {displayedTemplates.map((template, index) => (
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
                    <div className="flex flex-col gap-2 p-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-purple-600 text-white hover:bg-purple-700"
                        onClick={() => handleStartFromTemplate(template)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Start from Template
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 text-white hover:bg-white/30"
                          onClick={() => router.push(`/templates/${template.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 text-white hover:bg-white/30"
                          onClick={() => handleDownloadTemplate(template.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
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
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleStartFromTemplate(template)}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Start from Template
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => router.push(`/templates/${template.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`)}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => handleStartFromTemplate(template)}
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalTemplatePages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentTemplatePage(Math.max(1, currentTemplatePage - 1))}
                      className={currentTemplatePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalTemplatePages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentTemplatePage(page)}
                        isActive={currentTemplatePage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentTemplatePage(Math.min(totalTemplatePages, currentTemplatePage + 1))}
                      className={currentTemplatePage === totalTemplatePages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

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

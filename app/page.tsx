"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Image as ImageIcon, 
  Gift, 
  Bell, 
  Heart, 
  ChevronDown,
  ExternalLink,
  Users
} from "lucide-react"
import Link from "next/link"
import { ChatInput } from "@/components/chat-input"
import { AuthModal } from "@/components/auth-modal"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { TemplateManager } from "@/lib/template-manager"

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    checkUser()
    loadTemplates()
  }, [])

  const loadTemplates = () => {
    const templateData = TemplateManager.getAllTemplates()
    setTemplates(templateData)
  }

  const handleTemplateSelect = async (templateId: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Import the required services
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      const template = TemplateManager.getTemplateById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Create workspace with template name
      const slug = template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const workspace = await storageManager.createWorkspace({
        name: template.title,
        description: template.description,
        userId: user.id,
        isPublic: false,
        isTemplate: true,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed',
        slug
      })

      // Apply template files
      await TemplateManager.applyTemplate(templateId, workspace.id)

      // Redirect to the workspace
      window.location.href = `/workspace/${workspace.id}`

    } catch (error) {
      console.error('Error creating project from template:', error)
      // You might want to show a toast notification here
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
          <h2 className="text-2xl sm:text-4xl md:text-7xl lg:text-8xl font-bold text-white mb-4 md:mb-6 leading-tight">
            Build something{" "}
            <span className="inline-flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full heart-gradient flex items-center justify-center mx-1 sm:mx-2">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white fill-current" />
              </div>
              Amazing
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
            Create webapps by chatting with AI.
          </p>
        </div>

        {/* Chat Input Section */}
        <div className="w-full max-w-4xl mx-auto">
          <ChatInput onAuthRequired={handleAuthRequired} />
        </div>
      </main>

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
              {/* Popular Dropdown */}
              <div className="relative group">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                  Popular
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Popular
                    </button>
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Recent
                    </button>
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Trending
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <Link href="/community" className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Discover
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Internal Tools
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Website
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Personal
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Consumer App
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  B2B App
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Prototype
                </Button>
              </div>
            </div>
          </div>

          {/* Community Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 group cursor-pointer"
                onClick={() => handleTemplateSelect(template.id)}
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
                    <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Project
                    </Button>
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
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  )
}

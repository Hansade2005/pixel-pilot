"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Plus,
  Image as ImageIcon,
  Gift,
  Bell,
  Heart,
  ChevronDown,
  ExternalLink,
  Users,
  Download
} from "lucide-react"
import Link from "next/link"
import { ChatInput } from "@/components/chat-input"
import { AuthModal } from "@/components/auth-modal"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { AnimatedCodeDemo } from "@/components/animated-code-demo"
import { createClient } from "@/lib/supabase/client"
import { TemplateManager } from "@/lib/template-manager"
import { toast } from "sonner"

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [sortBy, setSortBy] = useState<string>('popular')
  const [filterBy, setFilterBy] = useState<string>('all')

  useEffect(() => {
    checkUser()
    loadTemplates()
    loadUsers()
  }, [])

  const loadTemplates = () => {
    const templateData = TemplateManager.getAllTemplates()
    setTemplates(templateData)
  }

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const response = await fetch('/api/public/users?limit=50')

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        console.error('Failed to load users:', response.status)
        setUsers([])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
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

        {/* Animated Code Demo Section */}
        <div className="mt-24 mb-12 w-full">
          <AnimatedCodeDemo />
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
                <Button variant="outline" className={`border-gray-600 text-white hover:bg-gray-700 ${sortBy === 'popular' ? 'bg-purple-600 border-purple-600' : ''}`}>
                  {sortBy === 'popular' ? 'Popular' : sortBy === 'recent' ? 'Recent' : 'Trending'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-2">
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${sortBy === 'popular' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => setSortBy('popular')}
                    >
                      Popular
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${sortBy === 'recent' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => setSortBy('recent')}
                    >
                      Recent
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 transition-colors ${sortBy === 'trending' ? 'bg-purple-600 text-white' : 'text-white hover:bg-gray-700'}`}
                      onClick={() => setSortBy('trending')}
                    >
                      Trending
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <Link href="/showcase" className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'all' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('all')}
                >
                  View All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'discover' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('discover')}
                >
                  Discover
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'internal' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('internal')}
                >
                  Internal Tools
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'website' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('website')}
                >
                  Website
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'personal' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('personal')}
                >
                  Personal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'consumer' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('consumer')}
                >
                  Consumer App
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'b2b' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('b2b')}
                >
                  B2B App
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 text-white hover:bg-gray-700 ${filterBy === 'prototype' ? 'bg-purple-600 border-purple-600' : ''}`}
                  onClick={() => setFilterBy('prototype')}
                >
                  Prototype
                </Button>
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

      {/* Community Users Section */}
      <section className="relative z-10 py-24 bg-gray-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Join Our Community
              </h2>
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              See what our amazing community members are building
            </p>
          </div>

          {/* Users Grid */}
          {usersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {users.map((user, index) => (
                <Card
                  key={user.id}
                  className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={user.avatarUrl || '/placeholder-user.jpg'}
                          alt={user.fullName || user.email}
                        />
                        <AvatarFallback>
                          {(user.fullName || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {user.fullName || user.email.split('@')[0]}
                        </h3>
                        <p className="text-gray-400 text-xs truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Plan:</span>
                        <Badge variant="outline" className="text-xs">
                          {user.subscriptionPlan}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Deployments:</span>
                        <span className="text-white">{user.deploymentsThisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">GitHub Pushes:</span>
                        <span className="text-white">{user.githubPushesThisMonth}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-xs">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Community members will appear here soon!</p>
            </div>
          )}
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

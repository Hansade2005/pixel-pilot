"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Code, Zap, Shield, ArrowRight, Search, FileText, Video, Users, Settings, Rocket, Database, MessageSquare, Cloud, Layers } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"

interface HelpResource {
  id: string
  title: string
  description: string
  content: any
  tags: string[]
  difficulty: string
  estimated_read_time: string
}

interface Category {
  id: string
  title: string
  description: string
  icon: string
  articles: HelpResource[]
}

export default function DocsPage() {
  const [helpResources, setHelpResources] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHelpResources = async () => {
      try {
        const response = await fetch('/help-resources.json')
        const data = await response.json()
        setHelpResources(data)
      } catch (error) {
        console.error('Failed to load help resources:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHelpResources()
  }, [])

  const getIconForCategory = (categoryId: string) => {
    const iconMap: Record<string, any> = {
      "getting-started": BookOpen,
      "ai-development": MessageSquare,
      "development-tools": Code,
      "deployment-integration": Rocket,
      "project-management": Layers,
      "troubleshooting": Settings
    }
    return iconMap[categoryId] || BookOpen
  }

  const getColorForCategory = (categoryId: string) => {
    const colorMap: Record<string, string> = {
      "getting-started": "blue",
      "ai-development": "purple",
      "development-tools": "green",
      "deployment-integration": "orange",
      "project-management": "indigo",
      "troubleshooting": "red"
    }
    return colorMap[categoryId] || "blue"
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading documentation...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const docsSections = helpResources?.categories?.map((category: Category, index: number) => ({
    title: category.title,
    description: category.description,
    icon: getIconForCategory(category.id),
    color: getColorForCategory(category.id),
    articles: category.articles.slice(0, 4).map((article: HelpResource) => article.title)
  })) || []

  const quickGuides = helpResources?.categories?.flatMap((category: Category) =>
    category.articles.slice(0, 4).map((article: HelpResource) => ({
      title: article.title,
      description: article.description,
      readTime: article.estimated_read_time,
      difficulty: article.difficulty.charAt(0).toUpperCase() + article.difficulty.slice(1),
      category: category.title,
      tags: article.tags
    }))
  ).slice(0, 4) || []

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      <div className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full heart-gradient flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Pixel Pilot Documentation
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
              Everything you need to build amazing applications with AI-powered development tools.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {docsSections.map((section: any, index: number) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <section.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white text-xl">{section.title}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {section.articles.map((article: string, articleIndex: number) => (
                      <div key={articleIndex} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 cursor-pointer">
                        <span className="text-gray-300 text-sm">{article}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    View All Articles
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Start Guides */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Quick Start Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickGuides.map((guide: any, index: number) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{guide.title}</h3>
                        <p className="text-gray-300 text-sm mb-3">{guide.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span>{guide.readTime}</span>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            {guide.difficulty}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {guide.tags?.slice(0, 3).map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs border-gray-600 text-gray-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Video Tutorials */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Video Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Getting Started with Pixel Pilot",
                  duration: "5:23",
                  thumbnail: "bg-gradient-to-br from-purple-500 to-pink-600"
                },
                {
                  title: "Building Your First AI App",
                  duration: "8:45",
                  thumbnail: "bg-gradient-to-br from-blue-500 to-purple-600"
                },
                {
                  title: "Advanced Features Overview",
                  duration: "12:30",
                  thumbnail: "bg-gradient-to-br from-green-500 to-blue-600"
                }
              ].map((video, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer">
                  <div className={`h-32 ${video.thumbnail} rounded-t-lg flex items-center justify-center`}>
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">{video.title}</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <span>{video.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Community Resources */}
          <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join our community of developers and get help from fellow Pixel Pilot users, or contact our support team directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Join Discord Community
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

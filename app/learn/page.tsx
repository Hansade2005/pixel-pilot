"use client"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Video, Play, Users, Clock, Star, ArrowRight, MessageSquare, Code, Rocket, Layers, Settings } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: {
    introduction: string
    main_content: Array<{
      heading: string
      body: string
      key_points?: string[]
      technical_highlights?: string[]
      market_trends?: string[]
      benefits?: string[]
      features?: string[]
      challenges?: string[]
      solutions?: string[]
    }>
    conclusion: string
    project_overview?: any
    development_journey?: any
    results_and_metrics?: any
    lessons_learned?: any
    case_studies?: any
    advanced_usage?: any
    real_world_examples?: any
  }
  author: string
  published_date: string
  last_modified: string
  category: string
  tags: string[]
  featured_image: string
  reading_time: string
  seo_meta: {
    title: string
    description: string
    keywords: string[]
  }
  related_posts: string[]
  status: string
}

interface HelpResource {
  id: string
  title: string
  description: string
  tags: string[]
  estimated_read_time: string
}

export default function LearnPage() {
  const [blogPosts, setBlogPosts] = useState<{ posts: BlogPost[] } | null>(null)
  const [helpResources, setHelpResources] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [blogResponse, helpResponse] = await Promise.all([
          fetch('/blog-posts.json'),
          fetch('/help-resources.json')
        ])

        const [blogData, helpData] = await Promise.all([
          blogResponse.json(),
          helpResponse.json()
        ])

        setBlogPosts(blogData)
        setHelpResources(helpData)
      } catch (error) {
        console.error('Failed to load learning data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
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

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading learning resources...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
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
      <main className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full heart-gradient flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Learn Pixel Pilot
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Master AI-powered development with our comprehensive learning resources and tutorials.
            </p>
          </div>

          {/* Learning Paths */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {helpResources?.categories?.slice(0, 3).map((category: any, index: number) => {
              const IconComponent = getIconForCategory(category.id)
              const totalArticles = category.articles.length
              const totalReadTime = category.articles.reduce((total: number, article: HelpResource) => {
                const minutes = parseInt(article.estimated_read_time.split(' ')[0])
                return total + minutes
              }, 0)

              return (
                <Card key={category.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-blue-400" />
                    </div>
                    <CardTitle className="text-white">{category.title}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">{totalReadTime} min</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{totalArticles} articles</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Video Tutorials */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Latest Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts?.posts?.slice(0, 6).map((post: BlogPost, index: number) => {
                const thumbnailGradients = [
                  "bg-gradient-to-br from-blue-500 to-purple-600",
                  "bg-gradient-to-br from-green-500 to-blue-600",
                  "bg-gradient-to-br from-purple-500 to-pink-600",
                  "bg-gradient-to-br from-yellow-500 to-orange-600",
                  "bg-gradient-to-br from-cyan-500 to-blue-600",
                  "bg-gradient-to-br from-emerald-500 to-teal-600"
                ]

                return (
                  <Link key={post.id} href={`/community/${post.slug || post.id}`}>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group h-full">
                      <div className={`h-32 ${thumbnailGradients[index % thumbnailGradients.length]} rounded-t-lg flex items-center justify-center relative overflow-hidden`}>
                        <Play className="w-8 h-8 text-white z-10 group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors leading-tight">{post.title}</h3>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2 flex-1">{post.excerpt}</p>
                        <div className="flex items-center justify-between text-sm text-gray-400 mt-auto">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {post.reading_time}
                          </span>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                            {post.category.replace('-', ' ')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.tags?.slice(0, 2).map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs border-gray-600 text-gray-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Documentation */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {helpResources?.categories?.flatMap((category: any) =>
                category.articles.slice(0, 2).map((article: HelpResource, index: number) => ({
                  ...article,
                  category: category.title,
                  icon: getIconForCategory(category.id),
                  categoryId: category.id
                }))
              ).slice(0, 6).map((doc: any, index: number) => (
                <Link key={index} href={`/docs#${doc.categoryId}`}>
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <doc.icon className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold truncate group-hover:text-purple-400 transition-colors">{doc.title}</h3>
                            <p className="text-gray-300 text-sm truncate">{doc.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                {doc.category}
                              </Badge>
                              <span className="text-xs text-gray-400">{doc.estimated_read_time}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-1">
              <Logo variant="text" size="md" className="mb-4" />
              <p className="text-gray-400 text-sm">
                Build something amazing with AI-powered development.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Press & media</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Enterprise</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trust center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Student discount</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Solutions</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Learn</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">How-to guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Videos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Reddit</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">X/Twitter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <Logo variant="icon" size="sm" />
              <span className="text-gray-400 text-sm">EN</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Pixel Pilot. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

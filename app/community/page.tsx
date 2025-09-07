"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageCircle, Star, TrendingUp, Calendar, MapPin, BookOpen, Code, Zap, Shield, ExternalLink, Clock, ArrowRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import Link from "next/link"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  published_date: string
  category: string
  tags: string[]
  featured_image: string
}

interface HelpResource {
  id: string
  title: string
  description: string
  tags: string[]
}

export default function CommunityPage() {
  const [blogPosts, setBlogPosts] = useState<{ posts: any[] } | null>(null)
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
        console.error('Failed to load community data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading community...</p>
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
                <Users className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Join the Pixel Pilot Community
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Connect with developers, share your projects, and get inspired by what others are building with AI.
            </p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-gray-300">Active Developers</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-gray-300">Projects Built</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-gray-300">Daily Discussions</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">100+</div>
                <div className="text-gray-300">Countries</div>
              </CardContent>
            </Card>
          </div>

          {/* Community Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Discord Community</CardTitle>
                <CardDescription className="text-gray-300">
                  Join our Discord server for real-time discussions, help, and networking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Join Discord
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Showcase Projects</CardTitle>
                <CardDescription className="text-gray-300">
                  Share your AI-powered creations and get feedback from the community.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Share Project
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Events & Meetups</CardTitle>
                <CardDescription className="text-gray-300">
                  Attend virtual and in-person events to learn and connect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  View Events
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Discussions */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Recent Discussions</h2>
            <div className="space-y-4">
              {helpResources?.categories?.flatMap((category: any) =>
                category.articles.slice(0, 3).map((article: HelpResource, index: number) => ({
                  ...article,
                  category: category.title,
                  replies: Math.floor(Math.random() * 30) + 10,
                  views: (Math.random() * 3).toFixed(1),
                  author: "Community Member"
                }))
              ).slice(0, 6).map((discussion: any, index: number) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{discussion.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                          <span>by {discussion.author}</span>
                          <span>{discussion.replies} replies</span>
                          <span>{discussion.views}k views</span>
                        </div>
                        <div className="flex space-x-2">
                          {discussion.tags?.slice(0, 3).map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="secondary" className="bg-gray-700 text-gray-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Featured Blog Posts */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts?.posts?.slice(0, 6).map((post: any, index: number) => {
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
                      <div className={`h-48 ${thumbnailGradients[index % thumbnailGradients.length]} rounded-t-lg flex items-center justify-center relative overflow-hidden`}>
                        <BookOpen className="w-12 h-12 text-white/80" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <Badge className={`w-fit mb-3 ${
                          post.category === 'platform-updates' ? 'bg-blue-500' :
                          post.category === 'tutorials' ? 'bg-green-500' :
                          post.category === 'case-studies' ? 'bg-yellow-500' :
                          post.category === 'industry-insights' ? 'bg-purple-500' :
                          'bg-red-500'
                        } text-white`}>
                          {post.category.replace('-', ' ').toUpperCase()}
                        </Badge>
                        <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-purple-400 transition-colors line-clamp-2 leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-400 mt-auto">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {post.reading_time}
                          </span>
                          <span>{new Date(post.published_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
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

            {/* View All Articles Button */}
            <div className="text-center mt-8">
              <Link href="/learn">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
                  View All Articles
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

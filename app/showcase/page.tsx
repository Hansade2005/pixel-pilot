"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ExternalLink, Heart, MessageCircle, Eye, Code, Globe, Zap, Users, TrendingUp } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function ShowcasePage() {
  const featuredProjects = [
    {
      title: "AI-Powered E-commerce Platform",
      description: "A complete e-commerce solution built in just 2 hours using Pixel Pilot's AI capabilities. Features include product management, shopping cart, and payment integration.",
      author: "Sarah Chen",
      avatar: "SC",
      stars: 127,
      views: 2400,
      tech: ["React", "Next.js", "Stripe", "Tailwind"],
      image: "bg-gradient-to-br from-blue-500 to-purple-600",
      featured: true
    },
    {
      title: "Real-time Chat Application",
      description: "Modern chat app with real-time messaging, user authentication, and file sharing. Built entirely with AI assistance in under an hour.",
      author: "Mike Johnson",
      avatar: "MJ",
      stars: 89,
      views: 1800,
      tech: ["React", "Socket.io", "Node.js", "MongoDB"],
      image: "bg-gradient-to-br from-green-500 to-blue-600",
      featured: true
    },
    {
      title: "Project Management Dashboard",
      description: "Comprehensive project management tool with task tracking, team collaboration, and progress analytics. Perfect for agile development teams.",
      author: "Alex Rodriguez",
      avatar: "AR",
      stars: 156,
      views: 3200,
      tech: ["Vue.js", "Firebase", "Chart.js", "Material-UI"],
      image: "bg-gradient-to-br from-purple-500 to-pink-600",
      featured: true
    }
  ]

  const recentProjects = [
    {
      title: "Weather App with AI Predictions",
      author: "Emma Davis",
      avatar: "ED",
      stars: 45,
      views: 890,
      tech: ["React", "OpenWeather API", "AI"],
      image: "bg-gradient-to-br from-cyan-500 to-blue-600"
    },
    {
      title: "Personal Finance Tracker",
      author: "David Wilson",
      avatar: "DW",
      stars: 78,
      views: 1200,
      tech: ["Next.js", "Prisma", "PostgreSQL"],
      image: "bg-gradient-to-br from-emerald-500 to-teal-600"
    },
    {
      title: "Recipe Sharing Platform",
      author: "Lisa Brown",
      avatar: "LB",
      stars: 92,
      views: 2100,
      tech: ["React", "Express", "MongoDB"],
      image: "bg-gradient-to-br from-orange-500 to-red-600"
    },
    {
      title: "Fitness Tracking App",
      author: "Tom Anderson",
      avatar: "TA",
      stars: 67,
      views: 1500,
      tech: ["React Native", "Firebase", "AI"],
      image: "bg-gradient-to-br from-pink-500 to-rose-600"
    }
  ]

  const stats = [
    { label: "Projects Shared", value: "2,500+", icon: Code },
    { label: "Active Developers", value: "50K+", icon: Users },
    { label: "Total Views", value: "1.2M+", icon: Eye },
    { label: "Stars Given", value: "15K+", icon: Star }
  ]

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
                <Star className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Project Showcase
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
              Discover amazing applications built with Pixel Pilot. Get inspired by what our community has created.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                Share Your Project
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                View All Projects
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-300">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Featured Projects */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Featured Projects</h2>
              <Badge className="bg-yellow-600 text-white">
                <Star className="w-3 h-3 mr-1" />
                Editor's Choice
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProjects.map((project, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors overflow-hidden">
                  <div className={`h-32 ${project.image} flex items-center justify-center`}>
                    <Code className="w-8 h-8 text-white" />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg">{project.title}</CardTitle>
                      {project.featured && (
                        <Badge className="bg-yellow-600 text-white text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-gray-300">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {project.avatar}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{project.author}</p>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span className="flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            {project.stars}
                          </span>
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            {project.views}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tech.map((tech, techIndex) => (
                        <Badge key={techIndex} variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Project
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-600">
                        <Heart className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Recent Projects</h2>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                View All
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentProjects.map((project, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-16 h-16 ${project.image} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {project.avatar}
                          </div>
                          <span className="text-gray-300 text-sm">{project.author}</span>
                          <div className="flex items-center space-x-3 text-xs text-gray-400">
                            <span className="flex items-center">
                              <Star className="w-3 h-3 mr-1" />
                              {project.stars}
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {project.views}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tech.map((tech, techIndex) => (
                            <Badge key={techIndex} variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-600">
                            <Heart className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Explore by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Web Apps", count: "1,200+", icon: Globe },
                { name: "Mobile Apps", count: "800+", icon: Zap },
                { name: "APIs", count: "400+", icon: Code },
                { name: "AI/ML", count: "300+", icon: TrendingUp }
              ].map((category, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                      <category.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{category.name}</h3>
                    <p className="text-gray-400 text-sm">{category.count} projects</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                <Code className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Share Your Project?</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of developers sharing their AI-powered creations. Showcase your work and inspire others in the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Submit Your Project
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Learn More
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

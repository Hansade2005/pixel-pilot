"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, 
  Search, 
  ArrowRight, 
  Zap, 
  Database, 
  Cloud, 
  Lock, 
  Code, 
  Rocket,
  FileText,
  Server,
  Terminal,
  Layers,
  Shield
} from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const docCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics and create your first database",
      icon: Zap,
      color: "purple",
      articles: [
        { title: "Quick Start Guide", href: "/docs/getting-started/quick-start", time: "5 min" },
        { title: "Core Concepts", href: "/docs/getting-started/concepts", time: "10 min" },
        { title: "Create Your First Database", href: "#", time: "5 min" },
        { title: "Using AI Schema Generator", href: "#", time: "10 min" }
      ]
    },
    {
      id: "database",
      title: "Database Tables",
      description: "Create and manage PostgreSQL database tables",
      icon: Database,
      color: "blue",
      articles: [
        { title: "Creating Tables", href: "#", time: "10 min" },
        { title: "AI Schema Generation", href: "#", time: "10 min" },
        { title: "Data Types (Text, Number, UUID, JSON, etc.)", href: "#", time: "15 min" },
        { title: "Adding & Editing Records", href: "#", time: "10 min" },
        { title: "Table Schema Management", href: "#", time: "15 min" },
        { title: "Row Level Security", href: "#", time: "20 min" }
      ]
    },
    {
      id: "api-keys",
      title: "API Keys & Authentication",
      description: "Secure access for external applications",
      icon: Lock,
      color: "orange",
      articles: [
        { title: "Creating API Keys", href: "#", time: "5 min" },
        { title: "Using API Keys in Your App", href: "#", time: "10 min" },
        { title: "Rate Limiting (1000 req/hour)", href: "#", time: "10 min" },
        { title: "API Key Security Best Practices", href: "#", time: "15 min" },
        { title: "Revoking & Managing Keys", href: "#", time: "5 min" }
      ]
    },
    {
      id: "rest-api",
      title: "REST API",
      description: "Auto-generated CRUD endpoints for your tables",
      icon: Code,
      color: "pink",
      articles: [
        { title: "API Documentation Generator", href: "#", time: "10 min" },
        { title: "GET - List Records", href: "#", time: "10 min" },
        { title: "POST - Create Records", href: "#", time: "10 min" },
        { title: "PUT - Update Records", href: "#", time: "10 min" },
        { title: "DELETE - Remove Records", href: "#", time: "10 min" },
        { title: "Error Handling", href: "#", time: "10 min" }
      ]
    },
    {
      id: "storage",
      title: "File Storage",
      description: "Upload and manage files (500MB per database)",
      icon: Cloud,
      color: "green",
      articles: [
        { title: "Uploading Files", href: "#", time: "10 min" },
        { title: "Supported File Types (Images, PDFs, Videos)", href: "#", time: "5 min" },
        { title: "Public vs Private Files", href: "#", time: "10 min" },
        { title: "Signed URLs for Private Files", href: "#", time: "15 min" },
        { title: "Storage Limits & Usage Tracking", href: "#", time: "10 min" }
      ]
    },
    {
      id: "integration",
      title: "Framework Integration",
      description: "Use PiPilot with popular frameworks",
      icon: Terminal,
      color: "indigo",
      articles: [
        { title: "Next.js Integration", href: "#", time: "15 min" },
        { title: "React + Vite Integration", href: "#", time: "15 min" },
        { title: "Vue.js Integration", href: "#", time: "15 min" },
        { title: "Node.js Integration", href: "#", time: "15 min" },
        { title: "Python Integration", href: "#", time: "15 min" },
        { title: "React Native & Mobile Apps", href: "#", time: "20 min" }
      ]
    },
    {
      id: "guides",
      title: "Step-by-Step Guides",
      description: "Build real-world applications",
      icon: FileText,
      color: "yellow",
      articles: [
        { title: "Build a Todo App", href: "#", time: "20 min" },
        { title: "User Authentication System", href: "#", time: "30 min" },
        { title: "Image Gallery with File Upload", href: "#", time: "25 min" },
        { title: "Blog with Database Tables", href: "#", time: "35 min" },
        { title: "Deploy to Vercel/Netlify", href: "#", time: "15 min" }
      ]
    },
    {
      id: "reference",
      title: "API Reference",
      description: "Complete API documentation",
      icon: Server,
      color: "red",
      articles: [
        { title: "Database API Endpoints", href: "#", time: "10 min" },
        { title: "Storage API Endpoints", href: "#", time: "10 min" },
        { title: "Authentication Headers", href: "#", time: "5 min" },
        { title: "Response Formats", href: "#", time: "5 min" },
        { title: "Status Codes & Errors", href: "#", time: "10 min" }
      ]
    }
  ]

  const quickLinks = [
    { title: "Quick Start", href: "/docs/getting-started/quick-start", icon: Zap },
    { title: "Create API Keys", href: "#", icon: Lock },
    { title: "AI Schema Generator", href: "#", icon: Layers },
    { title: "File Storage Guide", href: "#", icon: Cloud }
  ]

  const colorClasses = {
    purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-red-500",
    pink: "from-pink-500 to-rose-500",
    yellow: "from-yellow-500 to-orange-500",
    indigo: "from-indigo-500 to-purple-500",
    red: "from-red-500 to-pink-500"
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0 lovable-gradient" />
      <div className="absolute inset-0 noise-texture" />

      <Navigation />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
                Documentation
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Everything you need to
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                  build amazing apps
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Comprehensive guides, API references, and tutorials to help you get started and scale
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-6 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {quickLinks.map((link, index) => (
                <Link key={index} href={link.href}>
                  <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all hover:scale-105 cursor-pointer h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <link.icon className="h-8 w-8 text-purple-400 mb-3" />
                      <span className="text-white font-medium">{link.title}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation Categories */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid gap-8">
              {docCategories.map((category) => (
                <Card key={category.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                        <category.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-2xl mb-2">{category.title}</CardTitle>
                        <CardDescription className="text-gray-400 text-base">
                          {category.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        {category.articles.length} articles
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.articles.map((article, index) => (
                        <Link key={index} href={article.href}>
                          <div className="group flex items-center justify-between p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-4 w-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
                              <span className="text-gray-300 group-hover:text-white transition-colors text-sm">
                                {article.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{article.time}</span>
                              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="py-16 px-4 bg-gray-900/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Additional Resources</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <Server className="h-8 w-8 text-blue-400 mb-4" />
                  <CardTitle className="text-white">API Status</CardTitle>
                  <CardDescription className="text-gray-400">
                    Check the current status of our APIs and services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="https://status.pipilot.dev" target="_blank">
                    <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-700">
                      View Status
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <Layers className="h-8 w-8 text-green-400 mb-4" />
                  <CardTitle className="text-white">Community</CardTitle>
                  <CardDescription className="text-gray-400">
                    Join our Discord community for help and discussions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/community">
                    <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-700">
                      Join Community
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <Shield className="h-8 w-8 text-purple-400 mb-4" />
                  <CardTitle className="text-white">Enterprise Support</CardTitle>
                  <CardDescription className="text-gray-400">
                    Get dedicated support for your production applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/enterprise">
                    <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-700">
                      Contact Sales
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to start building?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Get started for free and scale as you grow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs/getting-started/quick-start">
                <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Quick Start Guide
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

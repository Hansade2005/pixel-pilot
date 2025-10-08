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

export default function NewDocsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const docCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics and get up and running in minutes",
      icon: Zap,
      color: "purple",
      articles: [
        { title: "Quick Start Guide", href: "/docs/getting-started/quick-start", time: "5 min" },
        { title: "Core Concepts", href: "/docs/getting-started/concepts", time: "10 min" },
        { title: "Installation", href: "/docs/getting-started/installation", time: "5 min" },
        { title: "First Project", href: "/docs/getting-started/first-project", time: "15 min" }
      ]
    },
    {
      id: "database",
      title: "Database",
      description: "Complete guide to working with PostgreSQL databases",
      icon: Database,
      color: "blue",
      articles: [
        { title: "Table Management", href: "/docs/database/tables", time: "10 min" },
        { title: "Queries & Filters", href: "/docs/database/queries", time: "15 min" },
        { title: "Insert & Update", href: "/docs/database/mutations", time: "10 min" },
        { title: "Relationships & Joins", href: "/docs/database/relationships", time: "20 min" },
        { title: "Full-Text Search", href: "/docs/database/search", time: "15 min" },
        { title: "Real-time Subscriptions", href: "/docs/database/realtime", time: "15 min" }
      ]
    },
    {
      id: "storage",
      title: "Storage",
      description: "File upload, management, and CDN delivery",
      icon: Cloud,
      color: "green",
      articles: [
        { title: "File Upload", href: "/docs/storage/upload", time: "10 min" },
        { title: "File Management", href: "/docs/storage/management", time: "10 min" },
        { title: "Access Control", href: "/docs/storage/access-control", time: "15 min" },
        { title: "Image Optimization", href: "/docs/storage/image-optimization", time: "10 min" },
        { title: "CDN Configuration", href: "/docs/storage/cdn", time: "10 min" }
      ]
    },
    {
      id: "authentication",
      title: "Authentication",
      description: "User authentication and authorization",
      icon: Lock,
      color: "orange",
      articles: [
        { title: "User Signup & Login", href: "/docs/auth/user-management", time: "10 min" },
        { title: "Social Authentication", href: "/docs/auth/social", time: "15 min" },
        { title: "Password Reset", href: "/docs/auth/password-reset", time: "10 min" },
        { title: "Row Level Security", href: "/docs/auth/rls", time: "20 min" },
        { title: "JWT Tokens", href: "/docs/auth/jwt", time: "15 min" }
      ]
    },
    {
      id: "api",
      title: "API Reference",
      description: "Complete REST and GraphQL API documentation",
      icon: Code,
      color: "pink",
      articles: [
        { title: "REST API", href: "/docs/api/rest", time: "15 min" },
        { title: "GraphQL API", href: "/docs/api/graphql", time: "20 min" },
        { title: "Real-time API", href: "/docs/api/realtime", time: "15 min" },
        { title: "Error Handling", href: "/docs/api/errors", time: "10 min" },
        { title: "Rate Limiting", href: "/docs/api/rate-limits", time: "10 min" }
      ]
    },
    {
      id: "deployment",
      title: "Deployment",
      description: "Deploy your applications to production",
      icon: Rocket,
      color: "yellow",
      articles: [
        { title: "Deploy to Vercel", href: "/docs/deployment/vercel", time: "10 min" },
        { title: "Deploy to Netlify", href: "/docs/deployment/netlify", time: "10 min" },
        { title: "Environment Variables", href: "/docs/deployment/env-variables", time: "10 min" },
        { title: "Custom Domains", href: "/docs/deployment/domains", time: "10 min" },
        { title: "SSL Certificates", href: "/docs/deployment/ssl", time: "10 min" }
      ]
    },
    {
      id: "guides",
      title: "Guides & Tutorials",
      description: "Step-by-step guides for common use cases",
      icon: FileText,
      color: "indigo",
      articles: [
        { title: "Build a Blog", href: "/docs/guides/blog", time: "30 min" },
        { title: "E-commerce Store", href: "/docs/guides/ecommerce", time: "45 min" },
        { title: "Real-time Chat App", href: "/docs/guides/chat", time: "40 min" },
        { title: "Social Network", href: "/docs/guides/social", time: "60 min" },
        { title: "SaaS Dashboard", href: "/docs/guides/saas", time: "50 min" }
      ]
    },
    {
      id: "sdk",
      title: "SDK References",
      description: "Language-specific SDK documentation",
      icon: Terminal,
      color: "red",
      articles: [
        { title: "JavaScript SDK", href: "/docs/sdk/javascript", time: "20 min" },
        { title: "TypeScript SDK", href: "/docs/sdk/typescript", time: "20 min" },
        { title: "Python SDK", href: "/docs/sdk/python", time: "20 min" },
        { title: "Go SDK", href: "/docs/sdk/go", time: "20 min" },
        { title: "CLI Tool", href: "/docs/sdk/cli", time: "15 min" }
      ]
    }
  ]

  const quickLinks = [
    { title: "Quick Start", href: "/docs/getting-started/quick-start", icon: Zap },
    { title: "API Reference", href: "/docs/api/rest", icon: Code },
    { title: "Database Guide", href: "/docs/database/tables", icon: Database },
    { title: "Deploy to Production", href: "/docs/deployment/vercel", icon: Rocket }
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
                  <Link href="https://status.yourplatform.com" target="_blank">
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

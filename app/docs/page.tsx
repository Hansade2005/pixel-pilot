"use client"

import { useState, useEffect } from "react"
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
  Shield,
  Brain,
  Settings,
  Workflow,
  CheckCircle,
  AlertCircle,
  Info,
  Clock
} from "lucide-react"
import Link from "next/link"

interface DocSection {
  title: string
  content: string
  search_keywords: string[]
  overview: string
}

interface DocsData {
  sections: DocSection[]
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [docsData, setDocsData] = useState<DocsData | null>(null)
  const [filteredSections, setFilteredSections] = useState<DocSection[]>([])

  useEffect(() => {
    const loadDocsData = async () => {
      try {
        const response = await fetch('/docs.json')
        const data = await response.json()
        setDocsData(data)
        setFilteredSections(data.sections)
      } catch (error) {
        console.error('Failed to load docs data:', error)
      }
    }

    loadDocsData()
  }, [])

  useEffect(() => {
    if (docsData) {
      const filtered = docsData.sections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.search_keywords.some(keyword =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
      setFilteredSections(filtered)
    }
  }, [searchQuery, docsData])

  const getIconForSection = (title: string) => {
    const iconMap: { [key: string]: any } = {
      'Introduction': BookOpen,
      'Core PiPilot Capabilities': Zap,
      'AI-Powered Development Assistant': Brain,
      'File System Operations': Settings,
      'Professional Development Standards': CheckCircle,
      'Framework Support': Layers,
      'Professional Design System': FileText,
      'Available Dependencies': Code,
      'Backend Integration (Supabase)': Database,
      'Advanced Features': Rocket,
      'Database as a Service': Server,
      'Deployment & Hosting': Cloud,
      'Communication Standards': Info,
      'Development Workflow': Workflow,
      'Use Cases': Terminal,
      'Security Best Practices': Shield,
      'Performance Optimization': Zap,
      'Troubleshooting Guide': AlertCircle
    }
    return iconMap[title] || BookOpen
  }

  const getColorForSection = (title: string) => {
    const colorMap: { [key: string]: string } = {
      'Introduction': 'purple',
      'Core PiPilot Capabilities': 'blue',
      'AI-Powered Development Assistant': 'green',
      'File System Operations': 'orange',
      'Professional Development Standards': 'red',
      'Framework Support': 'indigo',
      'Professional Design System': 'pink',
      'Available Dependencies': 'yellow',
      'Backend Integration (Supabase)': 'blue',
      'Advanced Features': 'purple',
      'Database as a Service': 'green',
      'Deployment & Hosting': 'orange',
      'Communication Standards': 'indigo',
      'Development Workflow': 'pink',
      'Use Cases': 'yellow',
      'Security Best Practices': 'red',
      'Performance Optimization': 'purple',
      'Troubleshooting Guide': 'gray'
    }
    return colorMap[title] || 'purple'
  }

  const getReadTime = (content: string) => {
    const wordsPerMinute = 200
    const wordCount = content.split(' ').length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
  }

  const quickLinks = docsData ? [
    {
      title: "Getting Started",
      href: "/docs/introduction",
      icon: BookOpen,
      description: docsData.sections.find(s => s.title === "Introduction")?.overview.substring(0, 100) + "..."
    },
    {
      title: "AI Assistant",
      href: "/docs/ai-powered-development-assistant",
      icon: Brain,
      description: docsData.sections.find(s => s.title === "AI-Powered Development Assistant")?.overview.substring(0, 100) + "..."
    },
    {
      title: "Framework Support",
      href: "/docs/framework-support",
      icon: Layers,
      description: docsData.sections.find(s => s.title === "Framework Support")?.overview.substring(0, 100) + "..."
    },
    {
      title: "Security Guide",
      href: "/docs/security-best-practices",
      icon: Shield,
      description: docsData.sections.find(s => s.title === "Security Best Practices")?.overview.substring(0, 100) + "..."
    }
  ] : []

  const colorClasses = {
    purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-red-500",
    pink: "from-pink-500 to-rose-500",
    yellow: "from-yellow-500 to-orange-500",
    indigo: "from-indigo-500 to-purple-500",
    red: "from-red-500 to-pink-500",
    gray: "from-gray-500 to-gray-600"
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

        {/* Documentation Sections */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid gap-8">
              {filteredSections.map((section, index) => {
                const IconComponent = getIconForSection(section.title)
                const color = getColorForSection(section.title)
                const slug = section.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-')

                return (
                  <Card key={index} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-white text-2xl mb-2">{section.title}</CardTitle>
                          <CardDescription className="text-gray-400 text-base">
                            {section.overview}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {getReadTime(section.content)}
                          </Badge>
                          <div className="flex flex-wrap gap-1">
                            {section.search_keywords.slice(0, 3).map((keyword, keywordIndex) => (
                              <Badge key={keywordIndex} variant="secondary" className="text-xs bg-gray-700/50 text-gray-300">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-400">
                            Learn about {section.title.toLowerCase()} features and capabilities
                          </div>
                        </div>
                        <Link href={`/docs/${slug}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                            Read More
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
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

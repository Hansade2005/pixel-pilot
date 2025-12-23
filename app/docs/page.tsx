"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  Search,
  ArrowRight,
  Menu,
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
  const [selectedSection, setSelectedSection] = useState<DocSection | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const loadDocsData = async () => {
      try {
        const response = await fetch('/docs.json')
        const data = await response.json()
        setDocsData(data)
        setFilteredSections(data.sections)
        setSelectedSection(data.sections[0] || null) // Select first section by default
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
      'Troubleshooting Guide': AlertCircle,
      'MCP Server Integration': Server,
      'PiPilot SDK': Code
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
      'Troubleshooting Guide': 'gray',
      'MCP Server Integration': 'blue',
      'PiPilot SDK': 'green'
    }
    return colorMap[title] || 'purple'
  }

  const getReadTime = (content: string) => {
    const wordsPerMinute = 200
    const wordCount = content.split(' ').length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
  }

  const createSlug = (title: string) => {
    return title.toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/\\s+/g, '-').replace(/--+/g, '-')
  }

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

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`${isMobile ? '' : 'w-80 border-r border-gray-800'} h-full bg-gray-900/50 flex flex-col max-h-screen`}>
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white mb-4">Documentation</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-2">
          {filteredSections.map((section, index) => {
            const IconComponent = getIconForSection(section.title)
            const color = getColorForSection(section.title)
            const isSelected = selectedSection?.title === section.title

            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedSection(section)
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`w-full text-left p-3 rounded-lg transition-all hover:bg-gray-800/50 ${
                  isSelected ? 'bg-purple-600/20 border border-purple-500/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex-shrink-0`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-white truncate">
                    {section.title}
                  </h3>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  const ContentArea = () => {
    if (!selectedSection) {
      return (
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Welcome to PiPilot Documentation</h3>
            <p className="text-gray-400">Select a section from the sidebar to get started</p>
          </div>
        </div>
      )
    }

    const IconComponent = getIconForSection(selectedSection.title)
    const color = getColorForSection(selectedSection.title)
    const slug = createSlug(selectedSection.title)

    return (
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{selectedSection.title}</h1>
                  <p className="text-lg text-gray-300 mb-4">{selectedSection.overview}</p>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      {getReadTime(selectedSection.content)} read
                    </Badge>
                    <Link href={`/docs/${slug}`}>
                      <Button variant="outline" size="sm" className="border-gray-700 text-white hover:bg-gray-800">
                        View Full Article
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div className="flex flex-wrap gap-2">
                {selectedSection.search_keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="bg-gray-700/50 text-gray-300">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children, ...props}) => (
                    <h1 className="text-3xl font-bold text-white mt-8 mb-4 first:mt-0" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({children, ...props}) => (
                    <h2 className="text-2xl font-semibold text-white mt-6 mb-3" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({children, ...props}) => (
                    <h3 className="text-xl font-medium text-white mt-4 mb-2" {...props}>
                      {children}
                    </h3>
                  ),
                  p: ({children, ...props}) => (
                    <p className="text-gray-300 leading-relaxed mb-4" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({children, ...props}) => (
                    <ul className="text-gray-300 leading-relaxed mb-4 ml-6 list-disc" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({children, ...props}) => (
                    <ol className="text-gray-300 leading-relaxed mb-4 ml-6 list-decimal" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({children, ...props}) => (
                    <li className="mb-1" {...props}>
                      {children}
                    </li>
                  ),
                  code: ({children, ...props}) => (
                    <code className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-green-400" {...props}>
                      {children}
                    </code>
                  ),
                  pre: ({children, ...props}) => (
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4" {...props}>
                      {children}
                    </pre>
                  ),
                  blockquote: ({children, ...props}) => (
                    <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 mb-4" {...props}>
                      {children}
                    </blockquote>
                  ),
                  strong: ({children, ...props}) => (
                    <strong className="font-semibold text-white" {...props}>
                      {children}
                    </strong>
                  ),
                  em: ({children, ...props}) => (
                    <em className="italic text-gray-300" {...props}>
                      {children}
                    </em>
                  )
                }}
              >
                {selectedSection.content}
              </ReactMarkdown>
            </div>

            {/* Navigation */}
            <div className="mt-12 pt-8 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                    Previous
                  </Button>
                  <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                    Next
                  </Button>
                </div>
                <Link href={`/docs/${slug}`}>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    Read Full Article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />

      <div className="pt-16 h-screen flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden fixed top-20 left-4 z-50 bg-gray-800/80 text-white hover:bg-gray-700"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-gray-900 border-gray-800">
            <SidebarContent isMobile />
          </SheetContent>
        </Sheet>

        {/* Content Area */}
        <ContentArea />
      </div>

      <Footer />
    </div>
  )
}
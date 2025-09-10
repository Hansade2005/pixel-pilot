"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Code, Zap, Shield, ArrowRight, Search, FileText, Video, Users, Settings, Rocket, Database, MessageSquare, Cloud, Layers, Filter, X, Phone, Mail } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import Link from "next/link"
import { enterpriseService } from "@/lib/supabase/enterprise"
import { toast } from "sonner"

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
  const [allHelpResources, setAllHelpResources] = useState<any>(null)
  const [filteredResources, setFilteredResources] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")

  // Contact modal states
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  })

  useEffect(() => {
    const loadHelpResources = async () => {
      try {
        const response = await fetch('/help-resources.json')
        const data = await response.json()
        setAllHelpResources(data)
        setFilteredResources(data)
      } catch (error) {
        console.error('Failed to load help resources:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHelpResources()
  }, [])

  // Live search and filtering
  useEffect(() => {
    if (!allHelpResources) return

    let filtered = { ...allHelpResources }
    let allArticles: HelpResource[] = []

    // Collect all articles from all categories
    filtered.categories?.forEach((category: Category) => {
      allArticles.push(...category.articles)
    })

    // Search filter
    if (searchQuery) {
      allArticles = allArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      allArticles = allArticles.filter(article => article.difficulty === selectedDifficulty)
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered.categories = filtered.categories?.filter((category: Category) => category.id === selectedCategory)
      if (filtered.categories) {
        filtered.categories.forEach((category: Category) => {
          category.articles = category.articles.filter((article: HelpResource) =>
            allArticles.some(filteredArticle => filteredArticle.id === article.id)
          )
        })
      }
    } else {
      // If no category filter, rebuild categories with filtered articles
      const categoryMap = new Map()
      allArticles.forEach(article => {
        const category = allHelpResources.categories.find((cat: Category) =>
          cat.articles.some((art: HelpResource) => art.id === article.id)
        )
        if (category) {
          if (!categoryMap.has(category.id)) {
            categoryMap.set(category.id, {
              ...category,
              articles: []
            })
          }
          categoryMap.get(category.id).articles.push(article)
        }
      })
      filtered.categories = Array.from(categoryMap.values())
    }

    setFilteredResources(filtered)
  }, [searchQuery, selectedCategory, selectedDifficulty, allHelpResources])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedDifficulty("all")
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await enterpriseService.submitContactRequest(contactForm)

      if (error) {
        console.error('Error submitting contact request:', error)
        toast.error('Failed to submit contact request. Please try again.')
        return
      }

      toast.success('Thank you! Our support team will contact you within 24 hours.')
      setShowContactModal(false)
      setContactForm({ name: '', email: '', company: '', phone: '', message: '' })
    } catch (error) {
      console.error('Error submitting contact request:', error)
      toast.error('Failed to submit contact request. Please try again.')
    }
  }

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

  const docsSections = filteredResources?.categories?.map((category: Category, index: number) => ({
    title: category.title,
    description: category.description,
    icon: getIconForCategory(category.id),
    color: getColorForCategory(category.id),
    articles: category.articles.slice(0, 6), // Show more articles
    id: category.id
  })) || []

  const quickGuides = filteredResources?.categories?.flatMap((category: Category) =>
    category.articles.slice(0, 3).map((article: HelpResource) => ({
      title: article.title,
      description: article.description,
      readTime: article.estimated_read_time,
      difficulty: article.difficulty.charAt(0).toUpperCase() + article.difficulty.slice(1),
      category: category.title,
      tags: article.tags,
      categoryId: category.id,
      id: article.id
    }))
  ).slice(0, 8) || [] // Show more quick guides

  const allTags = Array.from(
    new Set(filteredResources?.categories?.flatMap((category: Category) =>
      category.articles.flatMap((article: HelpResource) => article.tags)
    ) || [])
  ).sort()

  const difficulties = ["beginner", "intermediate", "advanced"]

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

            {/* Search and Filter Section */}
            <div className="max-w-4xl mx-auto mb-12">
              {/* Search Bar */}
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search documentation, guides, or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                  />
                  {(searchQuery || selectedCategory !== "all" || selectedDifficulty !== "all") && (
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center justify-center">
                {/* Category Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Categories</option>
                    {allHelpResources?.categories?.map((category: Category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Level:</span>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Levels</option>
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || selectedCategory !== "all" || selectedDifficulty !== "all") && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {searchQuery && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      Category: {allHelpResources?.categories?.find((c: Category) => c.id === selectedCategory)?.title}
                    </Badge>
                  )}
                  {selectedDifficulty !== "all" && (
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Level: {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="text-center mb-8">
              <p className="text-gray-300">
                {filteredResources?.categories?.reduce((total: number, category: Category) => total + category.articles.length, 0) || 0} documentation articles available
              </p>
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
                    {section.articles.map((article: HelpResource, articleIndex: number) => (
                      <Link key={articleIndex} href={`/docs/${article.id}`}>
                        <div className="flex items-center justify-between p-3 rounded hover:bg-gray-700/50 cursor-pointer transition-colors">
                          <div className="flex-1">
                            <span className="text-gray-300 text-sm font-medium block">{article.title}</span>
                            <span className="text-gray-400 text-xs">{article.estimated_read_time}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/docs#${section.id}`}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      View All Articles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Start Guides */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Quick Start Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickGuides.map((guide: any, index: number) => (
                <Link key={index} href={`/docs/${guide.id}`}>
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">{guide.title}</h3>
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
                        <ArrowRight className="w-5 h-5 text-gray-400 mt-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => toast.info("Coming soon!")}
              >
                Join Discord Community
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-700"
                onClick={() => setShowContactModal(true)}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Contact Support</h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <Input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                  <Input
                    type="text"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
                  <Textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Describe your issue or question..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Send Message
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}

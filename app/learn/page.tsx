"use client"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  BookOpen, Video, Play, Users, Clock, Star, ArrowRight, MessageSquare, Code, Rocket, Layers, Settings,
  Search, Filter, CheckCircle, TrendingUp, Award, Target, Lightbulb, Zap, BarChart3, X, GraduationCap,
  PlayCircle, FileText, Trophy, Calendar, User
} from "lucide-react"
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
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([])
  const [allHelpResources, setAllHelpResources] = useState<any>(null)
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [filteredResources, setFilteredResources] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedContentType, setSelectedContentType] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")

  const learningPaths = [
    {
      id: "beginner",
      title: "AI Development Fundamentals",
      description: "Start your journey with the basics of AI-powered development",
      duration: "2-3 weeks",
      level: "Beginner",
      courses: 8,
      icon: Target,
      color: "blue",
      skills: ["Basic AI concepts", "Simple app building", "Deployment basics"]
    },
    {
      id: "intermediate",
      title: "Advanced AI Development",
      description: "Master complex AI features and advanced development techniques",
      duration: "4-6 weeks",
      level: "Intermediate",
      courses: 12,
      icon: Zap,
      color: "purple",
      skills: ["Complex AI features", "Advanced integrations", "Performance optimization"]
    },
    {
      id: "expert",
      title: "Enterprise AI Solutions",
      description: "Build enterprise-grade applications with advanced AI capabilities",
      duration: "6-8 weeks",
      level: "Expert",
      courses: 15,
      icon: Award,
      color: "gold",
      skills: ["Enterprise architecture", "Advanced security", "Team collaboration"]
    }
  ]

  const quickStartCourses = [
    {
      title: "Build Your First AI App",
      description: "Create a simple task management app with AI assistance",
      duration: "45 min",
      difficulty: "Beginner",
      students: "12.5K",
      rating: 4.8,
      icon: Rocket
    },
    {
      title: "AI-Powered Chatbots",
      description: "Design and deploy intelligent conversational interfaces",
      duration: "1.5 hours",
      difficulty: "Intermediate",
      students: "8.2K",
      rating: 4.9,
      icon: MessageSquare
    },
    {
      title: "Database Integration with AI",
      description: "Connect your apps to databases using AI-driven queries",
      duration: "2 hours",
      difficulty: "Intermediate",
      students: "6.8K",
      rating: 4.7,
      icon: BarChart3
    },
    {
      title: "API Development & Testing",
      description: "Build robust APIs with automated testing and AI assistance",
      duration: "3 hours",
      difficulty: "Advanced",
      students: "4.1K",
      rating: 4.9,
      icon: Code
    }
  ]

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

        setAllBlogPosts(blogData.posts || [])
        setAllHelpResources(helpData)
        setFilteredPosts(blogData.posts || [])
        setFilteredResources(helpData)
      } catch (error) {
        console.error('Failed to load learning data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Live search and filtering
  useEffect(() => {
    let filteredBlogPosts = allBlogPosts
    let filteredHelp = { ...allHelpResources }

    // Search filter
    if (searchQuery) {
      filteredBlogPosts = filteredBlogPosts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      // Filter help resources
      if (filteredHelp?.categories) {
        filteredHelp.categories = filteredHelp.categories.map((category: any) => ({
          ...category,
          articles: category.articles.filter((article: HelpResource) =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        })).filter((category: any) => category.articles.length > 0)
      }
    }

    // Category filter for blog posts
    if (selectedCategory !== "all") {
      filteredBlogPosts = filteredBlogPosts.filter(post => post.category === selectedCategory)
    }

    // Content type filter
    if (selectedContentType !== "all") {
      if (selectedContentType === "tutorials") {
        filteredBlogPosts = filteredBlogPosts.filter(post =>
          post.category === "tutorials" || post.tags.includes("tutorial")
        )
      } else if (selectedContentType === "documentation") {
        // Keep all for documentation
      }
    }

    setFilteredPosts(filteredBlogPosts)
    setFilteredResources(filteredHelp)
  }, [searchQuery, selectedCategory, selectedContentType, allBlogPosts, allHelpResources])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedContentType("all")
    setSelectedDifficulty("all")
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "bg-green-600"
      case "intermediate": return "bg-yellow-600"
      case "advanced": return "bg-red-600"
      default: return "bg-gray-600"
    }
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
          {/* Enhanced Hero Section */}
          <div className="text-center mb-20">
            <div className="flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full heart-gradient flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Master
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                AI Development
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-4xl mx-auto mb-8 leading-relaxed">
              From beginner to expert, learn everything you need to build amazing applications
              with AI-powered development tools. Join thousands of developers mastering the future.
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">25+</div>
                <div className="text-gray-400">Learning Modules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-gray-400">Students Learning</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">4.9</div>
                <div className="text-gray-400">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-400">Learning Support</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg">
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Learning Now
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700 px-8 py-4 text-lg">
                <BookOpen className="w-5 h-5 mr-2" />
                Browse Courses
              </Button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              {/* Search Bar */}
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search courses, tutorials, and documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                  />
                  {(searchQuery || selectedCategory !== "all" || selectedContentType !== "all" || selectedDifficulty !== "all") && (
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
                    <option value="platform-updates">Platform Updates</option>
                    <option value="tutorials">Tutorials</option>
                    <option value="case-studies">Case Studies</option>
                    <option value="industry-insights">Industry Insights</option>
                    <option value="best-practices">Best Practices</option>
                  </select>
                </div>

                {/* Content Type Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Type:</span>
                  <select
                    value={selectedContentType}
                    onChange={(e) => setSelectedContentType(e.target.value)}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Content</option>
                    <option value="tutorials">Tutorials</option>
                    <option value="documentation">Documentation</option>
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
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || selectedCategory !== "all" || selectedContentType !== "all" || selectedDifficulty !== "all") && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {searchQuery && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      Category: {selectedCategory.replace('-', ' ')}
                    </Badge>
                  )}
                  {selectedContentType !== "all" && (
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Type: {selectedContentType}
                    </Badge>
                  )}
                  {selectedDifficulty !== "all" && (
                    <Badge variant="secondary" className="bg-orange-600 text-white">
                      Level: {selectedDifficulty}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Learning Paths */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Learning Paths</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Structured learning journeys to take you from beginner to expert in AI development.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {learningPaths.map((path, index) => {
                const IconComponent = path.icon
                return (
                  <Card key={path.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors group cursor-pointer">
                    <CardHeader className="text-center pb-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-8 h-8 text-purple-400" />
                      </div>
                      <CardTitle className="text-white text-xl mb-2">{path.title}</CardTitle>
                      <Badge variant="secondary" className={`${path.color === 'gold' ? 'bg-yellow-600' : path.color === 'purple' ? 'bg-purple-600' : 'bg-blue-600'} text-white mb-3`}>
                        {path.level}
                      </Badge>
                      <CardDescription className="text-gray-300">
                        {path.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-white">{path.duration}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Courses:</span>
                          <span className="text-white">{path.courses}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-700/50">
                          <p className="text-xs text-gray-400 mb-2">You'll learn:</p>
                          <div className="flex flex-wrap gap-1">
                            {path.skills.map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="outline" className="text-xs border-gray-600 text-gray-400">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 group-hover:bg-purple-700">
                          Start Path
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Quick Start Courses */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Quick Start Courses</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Jump right in with our most popular beginner-friendly courses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickStartCourses.map((course, index) => {
                const IconComponent = course.icon
                return (
                  <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group">
                    <CardHeader className="text-center pb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-6 h-6 text-green-400" />
                      </div>
                      <CardTitle className="text-white text-lg mb-2">{course.title}</CardTitle>
                      <Badge variant="secondary" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {course.description}
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            {course.duration}
                          </span>
                          <span className="flex items-center text-gray-400">
                            <User className="w-4 h-4 mr-1" />
                            {course.students}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-white text-sm">{course.rating}</span>
                          </div>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            Start
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Latest Content */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Latest Content</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Stay updated with the latest tutorials, insights, and platform updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {filteredPosts.slice(0, 6).map((post, index) => {
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
                          post.category === 'best-practices' ? 'bg-orange-500' :
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

            <div className="text-center">
              <Link href="/community">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4">
                  View All Content
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Documentation Hub */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Documentation Hub</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Comprehensive guides and references for every aspect of Pixel Pilot.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredResources?.categories?.slice(0, 6).map((category: any, index: number) => {
                const IconComponent = getIconForCategory(category.id)
                const totalArticles = category.articles.length
                const totalReadTime = category.articles.reduce((total: number, article: HelpResource) => {
                  const minutes = parseInt(article.estimated_read_time.split(' ')[0])
                  return total + minutes
                }, 0)

                return (
                  <Link key={category.id} href={`/docs#${category.id}`}>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group">
                      <CardHeader>
                        <div className="flex items-start space-x-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <IconComponent className="w-7 h-7 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-white text-xl mb-2">{category.title}</CardTitle>
                            <CardDescription className="text-gray-300 leading-relaxed">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              {totalArticles} articles
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {totalReadTime}min
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="space-y-2">
                          {category.articles.slice(0, 3).map((article: HelpResource, articleIndex: number) => (
                            <div key={articleIndex} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                              <span className="text-gray-300 text-sm truncate">{article.title}</span>
                              <span className="text-gray-400 text-xs">{article.estimated_read_time}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Learning Progress & Achievements */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl p-12 backdrop-blur-sm border border-purple-500/20 mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Track Your Progress</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Monitor your learning journey with personalized progress tracking and achievements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Learning Goals</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Set personalized learning objectives and track your progress towards mastery.
                  </p>
                  <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
                    Set Goals
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Achievements</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Unlock badges and certificates as you complete courses and reach milestones.
                  </p>
                  <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white">
                    View Badges
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Analytics</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Detailed insights into your learning patterns and areas for improvement.
                  </p>
                  <Button variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white">
                    View Stats
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ArrowLeft, Clock, Calendar, Tag, ChevronRight, ExternalLink, Share2, Bookmark } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

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

export default function DocPage() {
  const params = useParams()
  const router = useRouter()
  const [docData, setDocData] = useState<HelpResource | null>(null)
  const [categoryData, setCategoryData] = useState<Category | null>(null)
  const [relatedDocs, setRelatedDocs] = useState<HelpResource[]>([])
  const [loading, setLoading] = useState(true)
  const [readingProgress, setReadingProgress] = useState(0)

  useEffect(() => {
    const loadDocData = async () => {
      try {
        const response = await fetch('/help-resources.json')
        const data = await response.json()
        const slug = params.slug as string

        // Find the article by ID or slug
        let foundArticle: HelpResource | null = null
        let foundCategory: Category | null = null

        for (const category of data.categories || []) {
          const article = category.articles.find((art: HelpResource) =>
            art.id === slug || art.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') === slug
          )
          if (article) {
            foundArticle = article
            foundCategory = category
            break
          }
        }

        if (foundArticle && foundCategory) {
          setDocData(foundArticle)
          setCategoryData(foundCategory)

          // Get related docs from the same category
          const related = foundCategory.articles
            .filter((art: HelpResource) => art.id !== foundArticle!.id)
            .slice(0, 3)
          setRelatedDocs(related)
        } else {
          router.push('/docs')
        }
      } catch (error) {
        console.error('Failed to load documentation:', error)
        router.push('/docs')
      } finally {
        setLoading(false)
      }
    }

    if (params.slug) {
      loadDocData()
    }
  }, [params.slug, router])

  // Reading progress tracking
  useEffect(() => {
    const updateReadingProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      setReadingProgress(progress)
    }

    window.addEventListener('scroll', updateReadingProgress)
    return () => window.removeEventListener('scroll', updateReadingProgress)
  }, [])

  const renderContentSection = (section: any, index: number) => {
    if (!section) return null

    return (
      <div key={index} id={`section-${index}`} className="mb-12">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-6">{section.heading}</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              {section.body}
            </p>

            {section.key_points && section.key_points.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {section.key_points.map((point: string, pointIndex: number) => (
                    <li key={pointIndex} className="flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.technical_highlights && section.technical_highlights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Technical Highlights</h3>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  {section.technical_highlights.map((highlight: string, highlightIndex: number) => (
                    <div key={highlightIndex} className="flex items-start space-x-2 mb-2 last:mb-0">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                      <span className="text-gray-300">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.benefits && section.benefits.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Array.isArray(section.benefits)
                    ? section.benefits
                    : section.benefits.split(', ')
                  ).map((benefit: string, benefitIndex: number) => (
                    <div key={benefitIndex} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <span className="text-green-300">{benefit.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
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

  if (!docData || !categoryData) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Documentation Not Found</h3>
            <p className="text-gray-400 mb-6">The requested documentation page could not be found.</p>
            <Link href="/docs">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Back to Documentation
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-20 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-400">
              <Link href="/docs" className="hover:text-white transition-colors">
                Documentation
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/docs#${categoryData.id}`} className="hover:text-white transition-colors">
                {categoryData.title}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">{docData.title}</span>
            </nav>
          </div>

          {/* Back Button */}
          <div className="mb-8">
            <Link href={`/docs#${categoryData.id}`}>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {categoryData.title}
              </Button>
            </Link>
          </div>

          {/* Article Header */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-blue-600 text-white">
                {categoryData.title}
              </Badge>
              <Badge variant="secondary" className={
                docData.difficulty === 'beginner' ? 'bg-green-600 text-white' :
                docData.difficulty === 'intermediate' ? 'bg-yellow-600 text-white' :
                'bg-red-600 text-white'
              }>
                {docData.difficulty.charAt(0).toUpperCase() + docData.difficulty.slice(1)}
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {docData.title}
            </h1>

            <p className="text-xl text-gray-300 leading-relaxed max-w-4xl mb-8">
              {docData.description}
            </p>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-6 text-gray-400">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{docData.estimated_read_time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Last updated recently</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-6">
              {docData.tags.map((tag: string, tagIndex: number) => (
                <Badge key={tagIndex} variant="outline" className="border-gray-600 text-gray-400">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Article Content */}
          <div className="max-w-4xl">
            {/* Introduction */}
            {docData.content?.introduction && (
              <div id="introduction" className="mb-12">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20">
                  <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {docData.content.introduction}
                  </p>
                </div>
              </div>
            )}

            {/* Main Content Sections */}
            {docData.content?.main_content?.map((section: any, index: number) =>
              renderContentSection(section, index)
            )}

            {/* Special Sections */}
            {docData.content?.prerequisites && (
              <div id="prerequisites" className="mb-12">
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-8 border border-blue-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6">Prerequisites</h2>
                  <ul className="space-y-3">
                    {docData.content.prerequisites.map((prereq: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step by Step Guide */}
            {docData.content?.step_by_step_setup && (
              <div id="setup-guide" className="mb-12">
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-8 border border-green-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Setup</h2>
                  <div className="space-y-6">
                    {docData.content.step_by_step_setup.map((step: any, index: number) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-gray-300 mb-3">{step.description}</p>
                            {step.details && (
                              <div className="bg-gray-900/50 rounded p-3 border border-gray-700/30">
                                <p className="text-gray-400 text-sm">{step.details}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            {docData.content?.tips && (
              <div id="tips" className="mb-12">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-8 border border-yellow-500/20">
                  <h2 className="text-2xl font-bold text-white mb-6">💡 Tips & Best Practices</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {docData.content.tips.map((tip: string, index: number) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <span className="text-yellow-200">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Documentation */}
          {relatedDocs.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-white mb-8">Related Documentation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedDocs.map((relatedDoc, index) => (
                  <Link key={index} href={`/docs/${relatedDoc.id}`}>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors cursor-pointer group">
                      <CardContent className="p-6">
                        <Badge variant="secondary" className="bg-blue-600 text-white mb-3">
                          {categoryData.title}
                        </Badge>
                        <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">
                          {relatedDoc.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {relatedDoc.description}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {relatedDoc.estimated_read_time}
                          </span>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {relatedDoc.difficulty}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-16 flex flex-wrap gap-4 justify-center">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Share2 className="w-4 h-4 mr-2" />
              Share This Article
            </Button>
            <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
              <Bookmark className="w-4 h-4 mr-2" />
              Save for Later
            </Button>
            <Link href={`/docs#${categoryData.id}`}>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                View All {categoryData.title}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

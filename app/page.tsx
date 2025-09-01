"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowUp, 
  Plus, 
  Image as ImageIcon, 
  Gift, 
  Bell, 
  Heart, 
  ChevronDown,
  ExternalLink,
  Users
} from "lucide-react"
import Link from "next/link"
import { ChatInput } from "@/components/chat-input"
import { AuthModal } from "@/components/auth-modal"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthRequired = () => {
    setShowAuthModal(true)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    checkUser()
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
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 pt-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            Build something{" "}
            <span className="inline-flex items-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full heart-gradient flex items-center justify-center mx-2">
                <Heart className="w-4 h-4 md:w-5 md:h-5 text-white fill-current" />
              </div>
              Amazing
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
            Create webapps by chatting with AI.
          </p>
        </div>

        {/* Chat Input Section */}
        <div className="w-full max-w-4xl mx-auto">
          <ChatInput onAuthRequired={handleAuthRequired} />
        </div>
      </main>

      {/* From Pixel Community Section */}
      <section className="relative z-10 py-24 bg-gray-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                From Pixel Community
              </h2>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Popular Dropdown */}
              <div className="relative group">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                  Popular
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Popular
                    </button>
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Recent
                    </button>
                    <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      Trending
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <Link href="/community" className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Discover
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Internal Tools
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Website
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Personal
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Consumer App
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  B2B App
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                  Prototype
                </Button>
              </div>
            </div>
          </div>

          {/* Community Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Cryptocurrency Trading Dashboard",
                category: "Website",
                remixes: 17024,
                image: "bg-gradient-to-br from-blue-500 to-purple-600",
                description: "Advanced trading interface with real-time charts"
              },
              {
                title: "CharacterForge Imagix",
                category: "Consumer App",
                remixes: 7421,
                image: "bg-gradient-to-br from-yellow-400 to-orange-500",
                description: "AI-powered character creation platform"
              },
              {
                title: "Forklift Navigator",
                category: "Prototype",
                remixes: 3000,
                image: "bg-gradient-to-br from-green-400 to-teal-500",
                description: "Dashboard de Controle for logistics"
              },
              {
                title: "Market Mosaic Online",
                category: "Consumer App",
                remixes: 7109,
                image: "bg-gradient-to-br from-purple-500 to-pink-600",
                description: "Complex dashboard with analytics"
              },
              {
                title: "PSK Services",
                category: "Website",
                remixes: 4521,
                image: "bg-gradient-to-br from-emerald-500 to-green-600",
                description: "Elevate Your Event Experience"
              },
              {
                title: "Pulse Robot Template",
                category: "Website",
                remixes: 3890,
                image: "bg-gradient-to-br from-orange-400 to-red-500",
                description: "Atlas: Where Code Meets Motion"
              },
              {
                title: "Landing Simulator Sorcery",
                category: "Website",
                remixes: 6234,
                image: "bg-gradient-to-br from-violet-500 to-purple-600",
                description: "Create Games With Just a Prompt"
              },
              {
                title: "Cortex Second Brain",
                category: "Consumer App",
                remixes: 8912,
                image: "bg-gradient-to-br from-cyan-500 to-blue-600",
                description: "Your Personal AI Engine"
              }
            ].map((project, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 group">
                <div className={`h-48 ${project.image} rounded-t-lg relative overflow-hidden`}>
                  {/* Project Preview Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Project
                    </Button>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-gray-800/80 text-white border-gray-600">
                      {project.category}
                    </Badge>
                  </div>
                  
                  {/* Remixes Count */}
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-white text-sm font-medium">
                        {project.remixes.toLocaleString()} Remixes
                      </span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show More Button */}
          <div className="text-center mt-12">
            <Link href="/community">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
                Show More
                <ArrowUp className="w-4 h-4 ml-2 rotate-45" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  )
}

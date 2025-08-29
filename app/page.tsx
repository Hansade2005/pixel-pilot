"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Play, User } from "lucide-react"
import Link from "next/link"
import { ChatDemo } from "@/components/chat-demo"
import { FeatureGrid } from "@/components/feature-grid"
import { ChatInput } from "@/components/chat-input"
import { AuthModal } from "@/components/auth-modal"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-700' 
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Logo variant="text" size="md" />
            </div>
            <div className="flex items-center space-x-4">
              {!isLoading && (
                <>
                  {user ? (
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${isScrolled ? 'text-gray-300' : 'text-gray-200'}`}>{user.email}</span>
                      <Link href="/workspace">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Go to Workspace
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <Link href="/auth/login">
                        <Button variant="ghost" className={`${isScrolled ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>Sign In</Button>
                      </Link>
                      <Link href="/auth/signup">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 bg-gray-800 text-gray-300 border-gray-600">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by Pixelways
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Build Apps by <span className="text-blue-400">prompting</span>
          </h1>  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          No-Code AI </h1>        
       
        </div>
      </section>

      {/* Chat Input Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <ChatInput onAuthRequired={handleAuthRequired} />
      </section>

      {/* Chat Demo Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">See AI App Building in Action</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Watch how simple conversations turn into complete applications with instant preview and deployment.
          </p>
        </div>
        <ChatDemo />
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Build Modern Apps</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            From idea to deployment, our AI-powered platform handles the complexity so you can focus on creativity.
          </p>
        </div>
        <FeatureGrid />
      </section>

      {/* CTA Section */}
      <section className="bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Transform Your Development Workflow?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join thousands of developers who are building faster and smarter with AI assistance.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Logo variant="text" size="sm" />
            </div>
            <div className="text-sm text-gray-400">
              © 2024 Pixel Builder. Built with AI, designed for developers.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  )
}

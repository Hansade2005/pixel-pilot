"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Video, Play, Users, Clock, Star, ArrowRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function LearnPage() {
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
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full heart-gradient flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Learn Pixel Pilot
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Master AI-powered development with our comprehensive learning resources and tutorials.
            </p>
          </div>

          {/* Learning Paths */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Getting Started</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn the basics of Pixel Pilot and build your first AI-powered app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">30 min</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Advanced Features</CardTitle>
                <CardDescription className="text-gray-300">
                  Explore advanced features like custom components and integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">2 hours</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Best Practices</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn industry best practices for AI-powered development.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">1.5 hours</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Tutorials */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Video Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Building a Todo App in 5 Minutes",
                  duration: "5:23",
                  views: "12.5k",
                  thumbnail: "bg-gradient-to-br from-blue-500 to-purple-600"
                },
                {
                  title: "Creating Custom Components",
                  duration: "8:45",
                  views: "8.2k",
                  thumbnail: "bg-gradient-to-br from-green-500 to-blue-600"
                },
                {
                  title: "Deploying Your First App",
                  duration: "6:12",
                  views: "15.1k",
                  thumbnail: "bg-gradient-to-br from-purple-500 to-pink-600"
                }
              ].map((video, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <div className={`h-32 ${video.thumbnail} rounded-t-lg flex items-center justify-center`}>
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">{video.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{video.duration}</span>
                      <span>{video.views} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Documentation */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "API Reference",
                "Component Library",
                "Deployment Guide",
                "Troubleshooting",
                "Performance Tips",
                "Security Best Practices"
              ].map((doc, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">{doc}</h3>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-1">
              <Logo variant="text" size="md" className="mb-4" />
              <p className="text-gray-400 text-sm">
                Build something amazing with AI-powered development.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Press & media</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Enterprise</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trust center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Student discount</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Solutions</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Learn</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">How-to guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Videos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Reddit</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">X/Twitter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <Logo variant="icon" size="sm" />
              <span className="text-gray-400 text-sm">EN</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Pixel Pilot. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

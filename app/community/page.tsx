"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageCircle, Star, TrendingUp, Calendar, MapPin } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function CommunityPage() {
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
                <Users className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Join the Pixel Pilot Community
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Connect with developers, share your projects, and get inspired by what others are building with AI.
            </p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-gray-300">Active Developers</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-gray-300">Projects Built</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-gray-300">Daily Discussions</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">100+</div>
                <div className="text-gray-300">Countries</div>
              </CardContent>
            </Card>
          </div>

          {/* Community Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Discord Community</CardTitle>
                <CardDescription className="text-gray-300">
                  Join our Discord server for real-time discussions, help, and networking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Join Discord
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Showcase Projects</CardTitle>
                <CardDescription className="text-gray-300">
                  Share your AI-powered creations and get feedback from the community.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Share Project
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Events & Meetups</CardTitle>
                <CardDescription className="text-gray-300">
                  Attend virtual and in-person events to learn and connect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  View Events
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Discussions */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Recent Discussions</h2>
            <div className="space-y-4">
              {[
                {
                  title: "How to build a real-time chat app with Pixel Pilot",
                  author: "Sarah Chen",
                  replies: 24,
                  views: 1.2,
                  tags: ["React", "Real-time"]
                },
                {
                  title: "Best practices for AI prompt engineering",
                  author: "Mike Johnson",
                  replies: 18,
                  views: 0.8,
                  tags: ["AI", "Tips"]
                },
                {
                  title: "Showcase: My e-commerce platform built in 2 hours",
                  author: "Alex Rodriguez",
                  replies: 32,
                  views: 2.1,
                  tags: ["Showcase", "E-commerce"]
                }
              ].map((discussion, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{discussion.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                          <span>by {discussion.author}</span>
                          <span>{discussion.replies} replies</span>
                          <span>{discussion.views}k views</span>
                        </div>
                        <div className="flex space-x-2">
                          {discussion.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="bg-gray-700 text-gray-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

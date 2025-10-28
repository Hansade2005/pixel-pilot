"use client"

import { AnimatedCodeDemo } from "@/components/animated-code-demo"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DemoPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-16">
        {/* Back to Home Button */}
        <div className="px-4 pt-8">
          <Link href="/">
            <Button variant="outline" className="mb-6 border-gray-600 text-white hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Demo Section */}
        <div className="px-4 pb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Live Code Demo
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Watch how PiPilot creates stunning web apps by chatting with AI
            </p>
          </div>

          <AnimatedCodeDemo />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

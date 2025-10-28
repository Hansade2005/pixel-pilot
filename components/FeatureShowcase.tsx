"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, Building2, Users, Server, Workflow, Figma, Cpu, Shield, Bot, FolderOpen, Import, ChevronLeft, ChevronRight } from "lucide-react"

const features = [
  {
    id: "pipilot-db",
    title: "PiPilot DB",
    description: "Deep AI integration database with intelligent query processing. Ask questions in plain English and get instant results.",
    icon: <Database className="w-8 h-8 text-blue-500" />,
    secondaryIcon: <Cpu className="w-6 h-6 text-blue-400" />,
    badges: ["AI-Powered", "New"],
    highlights: ["Natural language queries", "Smart auto-indexing", "Real-time analytics", "AI-powered insights"],
    cta: "Explore Database"
  },
  {
    id: "pipilot-enterprise",
    title: "PiPilot Enterprise",
    description: "Enterprise-grade solutions with advanced security and scalability. Deploy with confidence at enterprise scale.",
    icon: <Building2 className="w-8 h-8 text-purple-500" />,
    secondaryIcon: <Shield className="w-6 h-6 text-purple-400" />,
    badges: ["Enterprise", "Secure"],
    highlights: ["Single Sign-On (SSO)", "Advanced permissions", "Compliance ready", "Enterprise support"],
    cta: "Start Enterprise Trial"
  },
  {
    id: "pipilot-teams",
    title: "PiPilot Teams",
    description: "Collaborative workspace for team development and sharing. Perfect for distributed teams.",
    icon: <Users className="w-8 h-8 text-green-500" />,
    secondaryIcon: <Users className="w-6 h-6 text-green-400" />,
    badges: ["Collaboration", "Real-time"],
    highlights: ["Live collaboration", "Shared workspaces", "Team permissions", "Real-time sync"],
    cta: "Create Team Workspace"
  },
  {
    id: "mcp-server",
    title: "PiPilot DB MCP Server",
    description: "Connect AI agents directly to your database with MCP protocol. The future of AI-agent-database integration.",
    icon: <Server className="w-8 h-8 text-orange-500" />,
    secondaryIcon: <Bot className="w-6 h-6 text-orange-400" />,
    badges: ["Coming Soon", "AI Agents"],
    highlights: ["MCP protocol support", "AI agent integration", "Secure connections", "Real-time data access"],
    cta: "Join Waitlist"
  },
  {
    id: "teams-workspace",
    title: "Teams Workspace",
    description: "Organize projects, manage permissions, and track team progress with advanced workspace management tools.",
    icon: <Workflow className="w-8 h-8 text-indigo-500" />,
    secondaryIcon: <FolderOpen className="w-6 h-6 text-indigo-400" />,
    badges: ["Workspace", "Management"],
    highlights: ["Project organization", "Permission management", "Progress tracking", "Team analytics"],
    cta: "Manage Workspaces"
  },
  {
    id: "figma-import",
    title: "Figma Import",
    description: "Convert Figma designs into functional code instantly. Bridge the gap between design and development.",
    icon: <Figma className="w-8 h-8 text-pink-500" />,
    secondaryIcon: <Import className="w-6 h-6 text-pink-400" />,
    badges: ["Design", "Import"],
    highlights: ["One-click import", "Design-to-code conversion", "Component extraction", "Style preservation"],
    cta: "Import from Figma"
  }
]

export function FeatureShowcase() {
  const [active, setActive] = useState(0)
  const [cardsPerSlide, setCardsPerSlide] = useState(1)

  // Update cards per slide based on screen size
  useEffect(() => {
    const updateCardsPerSlide = () => {
      setCardsPerSlide(window.innerWidth >= 768 ? 2 : 1)
    }

    updateCardsPerSlide()
    window.addEventListener('resize', updateCardsPerSlide)
    return () => window.removeEventListener('resize', updateCardsPerSlide)
  }, [])

  const totalSlides = Math.ceil(features.length / cardsPerSlide)

  const nextSlide = () => {
    setActive((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setActive((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  const goToSlide = (index: number) => {
    setActive(index)
  }

  return (
    <section className="w-full py-16 px-2 md:px-0 bg-transparent">
      <h2 className="text-center text-3xl md:text-5xl font-extrabold mb-8 text-white drop-shadow-lg">Platform Features</h2>
      <div className="relative w-full max-w-6xl mx-auto">
        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={active === 0}
          aria-label="Previous feature"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={active === totalSlides - 1}
          aria-label="Next feature"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Feature Cards Container */}
        <div className="relative overflow-hidden rounded-3xl">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {Array.from({ length: totalSlides }, (_, slideIndex) => (
              <div
                key={slideIndex}
                className="min-w-full flex-shrink-0 px-4"
              >
                <div className={`grid gap-6 ${cardsPerSlide === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  {features
                    .slice(slideIndex * cardsPerSlide, (slideIndex + 1) * cardsPerSlide)
                    .map((feature, idx) => (
                      <div
                        key={feature.id}
                        className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:border-white/40 hover:bg-white/10"
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/20 shadow-lg">
                            {feature.icon}
                          </div>
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-white/5 to-white/10 border border-white/20">
                            {feature.secondaryIcon}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {feature.badges.map((badge, i) => (
                            <Badge key={i} className="bg-white/10 text-white/80 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-white/80 text-base mb-6 leading-relaxed">{feature.description}</p>
                        <ul className="mb-6 space-y-3">
                          {feature.highlights.map((h, i) => (
                            <li key={i} className="flex items-center text-white/70 text-sm">
                              <span className="w-2 h-2 bg-purple-400 rounded-full mr-3 flex-shrink-0"></span>
                              {h}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full mt-auto bg-purple-600/80 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 py-3">
                          {feature.cta}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-3 mt-8">
          {Array.from({ length: totalSlides }, (_, idx) => (
            <button
              key={idx}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${active === idx ? "bg-purple-400 scale-125" : "bg-white/30 hover:bg-white/60"}`}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

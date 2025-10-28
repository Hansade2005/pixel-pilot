"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  Building2, 
  Users, 
  Server, 
  Workflow, 
  Figma,
  Sparkles,
  Rocket,
  Zap,
  Brain,
  Globe,
  Shield
} from "lucide-react"

const features = [
  {
    id: "pipilot-db",
    title: "PiPilot DB",
    description: "Deep AI integration database with intelligent query processing",
    icon: Database,
    emoji: "🗄️",
    gradient: "from-blue-500 to-cyan-600",
    badges: ["AI-Powered", "New"],
    details: "Advanced database with natural language queries and smart indexing"
  },
  {
    id: "pipilot-enterprise",
    title: "PiPilot Enterprise",
    description: "Enterprise-grade solutions with advanced security and scalability",
    icon: Building2,
    emoji: "🏢",
    gradient: "from-purple-500 to-pink-600",
    badges: ["Enterprise", "Secure"],
    details: "Built for teams with SSO, advanced permissions, and compliance"
  },
  {
    id: "pipilot-teams",
    title: "PiPilot Teams",
    description: "Collaborative workspace for team development and sharing",
    icon: Users,
    emoji: "👥",
    gradient: "from-green-500 to-teal-600",
    badges: ["Collaboration", "Real-time"],
    details: "Work together seamlessly with shared projects and live collaboration"
  },
  {
    id: "mcp-server",
    title: "PiPilot DB MCP Server",
    description: "Coming soon: MCP server for AI agents integration",
    icon: Server,
    emoji: "🤖",
    gradient: "from-orange-500 to-red-600",
    badges: ["Coming Soon", "AI Agents"],
    details: "Connect AI agents directly to your database with MCP protocol"
  },
  {
    id: "teams-workspace",
    title: "Teams Workspace",
    description: "Advanced workspace management for team collaboration",
    icon: Workflow,
    emoji: "🔄",
    gradient: "from-indigo-500 to-blue-600",
    badges: ["Workspace", "Management"],
    details: "Organize projects, manage permissions, and track team progress"
  },
  {
    id: "figma-import",
    title: "Figma Import",
    description: "Import designs directly from Figma to jumpstart development",
    icon: Figma,
    emoji: "🎨",
    gradient: "from-pink-500 to-rose-600",
    badges: ["Design", "Import"],
    details: "Convert Figma designs into functional code instantly"
  }
]

export function FeatureVibeCards() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % features.length)
        setIsAnimating(false)
      }, 300)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getVisibleCards = () => {
    const cards = []
    const totalCards = features.length
    
    for (let i = 0; i < 3; i++) {
      const index = (activeIndex + i) % totalCards
      cards.push({
        ...features[index],
        position: i,
        isActive: i === 0
      })
    }
    
    return cards
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-12 mb-8 vibe-card-background">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 flex justify-center items-center gap-4 px-4">
        {getVisibleCards().map((card, index) => {
          const Icon = card.icon
          const scale = card.isActive ? 1 : 0.85
          const opacity = card.isActive ? 1 : 0.7
          const zIndex = 3 - index
          const translateX = index === 0 ? 0 : index === 1 ? 120 : -120
          
          return (
            <Card
              key={`${card.id}-${index}`}
              className={`
                relative transition-all duration-500 ease-out cursor-pointer
                ${card.isActive ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-transparent vibe-card-active' : ''}
                ${isAnimating ? 'scale-95 opacity-50' : ''}
                ${index === 1 ? 'animate-slide-in-right' : index === 2 ? 'animate-slide-in-left' : ''}
              `}
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity,
                zIndex,
                minWidth: card.isActive ? '320px' : '280px',
                maxWidth: card.isActive ? '320px' : '280px'
              }}
              onClick={() => setActiveIndex(features.findIndex(f => f.id === card.id))}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-10 rounded-lg`} />
              
              <CardContent className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{card.emoji}</span>
                        <h3 className="text-lg font-bold text-white">{card.title}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {card.badges.map((badge, badgeIndex) => (
                    <Badge 
                      key={badgeIndex}
                      variant="secondary" 
                      className={`
                        text-xs px-2 py-1
                        ${badge === "Coming Soon" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : 
                          badge === "New" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                          "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        }
                      `}
                    >
                      {badge === "Coming Soon" && "🚀 "}
                      {badge === "New" && "✨ "}
                      {badge === "AI-Powered" && "🧠 "}
                      {badge === "Enterprise" && "🏢 "}
                      {badge === "Collaboration" && "👥 "}
                      {badge === "AI Agents" && "🤖 "}
                      {badge === "Design" && "🎨 "}
                      {badge}
                    </Badge>
                  ))}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <p className="text-white/90 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  
                  {card.isActive && (
                    <div className="animate-fade-in">
                      <div className="h-px bg-white/20 my-3" />
                      <p className="text-white/70 text-xs leading-relaxed">
                        {card.details}
                      </p>
                    </div>
                  )}
                </div>

                {/* Floating elements for active card */}
                {card.isActive && (
                  <div className="absolute -top-2 -right-2 w-6 h-6">
                    <Sparkles className="w-full h-full text-yellow-400 animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center space-x-2 mt-8">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${index === activeIndex 
                ? 'w-8 bg-white/80' 
                : 'bg-white/30 hover:bg-white/50'
              }
            `}
          />
        ))}
      </div>

      {/* Feature highlights */}
      <div className="flex justify-center space-x-8 mt-8 text-white/60 text-sm">
        <div className="flex items-center space-x-2">
          <Rocket className="w-4 h-4" />
          <span>6 New Features</span>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4" />
          <span>AI-Powered</span>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4" />
          <span>Smart Integration</span>
        </div>
      </div>
    </div>
  )
}
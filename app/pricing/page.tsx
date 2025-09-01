"use client"

import { useState } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Heart, Check, Info, ChevronDown, Star, Users } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const pricingTiers = [
    {
      name: "Free",
      description: "Discover what Pixel Pilot can do for you",
      price: "$0",
      period: "per month",
      note: "Free forever",
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      features: [
        "Free for everyone",
        "5 daily credits (up to 30/month)",
        "Public projects",
        "Unlimited collaborators"
      ]
    },
    {
      name: "Pro",
      description: "Designed for fast-moving teams building together in real time.",
      price: isAnnual ? "$20" : "$25",
      period: "per month",
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      features: [
        "100 credits / month",
        "Everything in Free, plus:",
        "100 monthly credits",
        "5 daily credits (up to 150/month)",
        "Private projects",
        "User roles & permissions",
        "Custom domains",
        "Remove the Pixel Pilot badge",
        "Credit rollovers"
      ]
    },
    {
      name: "Business",
      description: "Advanced controls and power features for growing departments",
      price: isAnnual ? "$40" : "$50",
      period: "per month",
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      features: [
        "100 credits / month",
        "All features in Pro, plus:",
        "100 monthly credits",
        "SSO",
        "Personal Projects",
        "Opt out of data training",
        "Design templates"
      ]
    },
    {
      name: "Enterprise",
      description: "Built for large orgs needing flexibility, scale, and governance.",
      price: "Flexible billing",
      period: "",
      buttonText: "Book a demo",
      buttonVariant: "default" as const,
      features: [
        "Custom plans",
        "Everything in Business, plus:",
        "Dedicated support",
        "Onboarding services",
        "Custom integrations",
        "Group-based access control",
        "Custom design systems"
      ]
    }
  ]

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
                <Heart className="w-3 h-3 text-white fill-current" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Pricing
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Start for free. Upgrade to get the capacity that exactly matches your team's needs.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center space-x-4 bg-gray-800/50 rounded-lg p-2 backdrop-blur-sm">
              <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-purple-600"
              />
              <span className={`text-sm ${isAnnual ? 'text-white' : 'text-gray-400'}`}>Annual</span>
              {isAnnual && (
                <Badge className="bg-green-600 text-white text-xs">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {pricingTiers.map((tier, index) => (
              <Card key={index} className={`bg-gray-800/50 border-gray-700/50 backdrop-blur-sm ${index === 1 ? 'ring-2 ring-purple-500' : ''}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-xl">{tier.name}</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-white">{tier.price}</span>
                      {tier.period && (
                        <span className="text-gray-400">{tier.period}</span>
                      )}
                    </div>
                    {tier.note && (
                      <p className="text-sm text-gray-400 mt-1">{tier.note}</p>
                    )}
                  </div>

                  <Button 
                    className={`w-full ${tier.buttonVariant === 'default' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  >
                    {tier.buttonText}
                  </Button>

                  <div className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-3">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                        {feature.includes('credits') && (
                          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Student Discount */}
          <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm mb-16">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Student discount</h3>
                <p className="text-gray-300">Verify student status and get access to up to 50% off Pixel Pilot Pro.</p>
              </div>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Learn more
              </Button>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              {[
                "What is Pixel Pilot and how does it work?",
                "What does the free plan include?",
                "What is a credit?",
                "What tech stacks does Pixel Pilot know?",
                "Who owns the projects and code?",
                "How much does it cost to use?",
                "Do you offer a student discount?",
                "Where can I find out more?"
              ].map((question, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm border border-gray-700/50">
                  <div className="flex items-center justify-between cursor-pointer">
                    <span className="text-white font-medium">{question}</span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
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

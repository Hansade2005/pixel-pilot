"use client"

import { useState, useEffect } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Heart, Check, Info, ChevronDown, Star, Users, Loader2 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { PRODUCT_CONFIGS, getPrice, getSavings } from "@/lib/stripe-config"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')

  const supabase = createClient()

  useEffect(() => {
    // Check authentication status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch current subscription using the polling endpoint
        const response = await fetch('/api/stripe/check-subscription', {
          method: 'POST',
        })
        if (response.ok) {
          const subscription = await response.json()
          setCurrentPlan(subscription.plan)
        }
      }
    }

    checkUser()

    // Check for success/cancel parameters
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')

    if (urlParams.get('success') === 'true' && sessionId) {
      // Handle successful payment - verify the session
      handlePaymentSuccess(sessionId)
    } else if (urlParams.get('canceled') === 'true') {
      // Handle canceled payment
      console.log('Payment canceled')
      // You could show a toast notification here
    }
  }, [])

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      console.log('Verifying payment session:', sessionId)

      const response = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Payment verified successfully:', result)

        // Update current plan state
        setCurrentPlan(result.plan)

        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('success')
        url.searchParams.delete('session_id')
        window.history.replaceState({}, '', url.toString())

        // You could show a success toast here
        alert(`Welcome to Pixel Pilot ${result.plan}! You now have ${result.credits} credits.`)
      } else {
        console.error('Payment verification failed')
        alert('There was an issue verifying your payment. Please contact support.')
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      alert('There was an error verifying your payment. Please contact support.')
    }
  }

  const handleSubscribe = async (planType: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login?redirect=/pricing'
      return
    }

    setLoadingPlan(planType)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          isAnnual,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const faqData = [
    {
      question: "What is Pixel Pilot and how does it work?",
      answer: "Pixel Pilot is an AI-powered development platform that helps you build web applications faster. Simply describe what you want to build, and our AI generates the code, handles the setup, and deploys your project automatically."
    },
    {
      question: "What does the free plan include?",
      answer: "The free plan includes 25 prompt credits per month, access to our Auto model, 2-week Pro trial, and basic project features. It's perfect for trying out Pixel Pilot and building small projects."
    },
    {
      question: "What is a credit?",
      answer: "A credit is used each time you make a request to our AI system. This includes generating code, making modifications, or deploying projects. Credits are consumed based on the complexity of your request and the AI model used."
    },
    {
      question: "What AI models are available?",
      answer: "Pixel Pilot supports leading AI models including OpenAI GPT, Claude, Gemini, xAI, and our specialized Auto model. Pro and higher plans include access to premium models and our SWE-1 coding specialist."
    },
    {
      question: "What is the SWE-1 model?",
      answer: "SWE-1 is our specialized coding AI model trained for software engineering tasks. It's available at promotional pricing of 0 credits per prompt on Pro and higher plans."
    },
    {
      question: "Who owns the projects and code?",
      answer: "You own 100% of your projects and code. All generated code is yours to use, modify, and distribute as you see fit. We don't claim any ownership over your creations."
    },
    {
      question: "How much does it cost to use?",
      answer: "Pixel Pilot offers a free tier with 25 credits per month. Paid plans start at $15/month for Pro (500 credits) and $30/month for Teams (500 credits per user with team features). Enterprise plans start at $60/month."
    },
    {
      question: "Can I purchase additional credits?",
      answer: "Yes! Add-on credits are available at $10 for 250 credits on Pro, and $40 for 1,000 credits on Teams and Enterprise plans. Additional credits never expire."
    },
    {
      question: "Where can I find out more?",
      answer: "You can learn more about Pixel Pilot by visiting our documentation, joining our community Discord, or contacting our support team. We also have tutorials and examples to help you get started."
    }
  ]

  // Generate pricing tiers from configuration
  const pricingTiers = Object.values(PRODUCT_CONFIGS).map(config => {
    const monthlyPrice = config.prices.monthly.amount
    const yearlyPrice = config.prices.yearly.amount
    const currentPrice = isAnnual ? yearlyPrice : monthlyPrice
    const originalPrice = isAnnual ? null : (yearlyPrice > 0 ? `$${yearlyPrice}` : null)
    const savings = getSavings(config.id, isAnnual)

    return {
      name: config.name,
      description: config.description,
      price: currentPrice === 0 ? "$0" : (config.id === 'enterprise' ? "starting at" : `$${currentPrice}`),
      priceAmount: config.id === 'enterprise' ? `$${currentPrice}` : undefined,
      originalPrice: originalPrice,
      period: isAnnual ? "per user / year" : "per user / month",
      savings: savings,
      note: config.id === 'pro' ? "Popular" : (config.id === 'free' ? "Grok Code Fast 1 is available for free for a limited time!" : undefined),
      buttonText: currentPlan === config.id ? "Current Plan" : (config.id === 'free' ? "Get Started" : (config.id === 'enterprise' ? "Contact Sales" : "Select plan")),
      buttonVariant: "default" as const,
      isPopular: config.id === 'pro',
      planType: config.id,
      stripePriceId: isAnnual ? config.prices.yearly.stripePriceId : config.prices.monthly.stripePriceId,
      features: config.features
    }
  })

  return (
    <>
      {/* Stripe.js script */}
      <script async src="https://js.stripe.com/v3/pricing.js"></script>

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
              Choose the perfect plan for your journey
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Pixel Pilot is available for free for a limited time!
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
              <Card key={index} className={`bg-gray-800/50 border-gray-700/50 backdrop-blur-sm relative ${tier.isPopular ? 'ring-2 ring-purple-500' : ''}`}>
                {tier.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-3 py-1">
                      Popular
                    </Badge>
                  </div>
                )}
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
                      {tier.priceAmount && (
                        <span className="text-3xl font-bold text-white">{tier.priceAmount}</span>
                      )}
                      {tier.period && (
                        <span className="text-gray-400">{tier.period}</span>
                      )}
                    </div>

                    {/* Show crossed out yearly price when on monthly */}
                    {tier.originalPrice && !isAnnual && (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-lg text-gray-500 line-through">{tier.originalPrice}/year</span>
                        {tier.savings && (
                          <span className="text-sm text-green-400 font-medium">{tier.savings}</span>
                        )}
                      </div>
                    )}

                    {/* Show savings badge when on yearly */}
                    {tier.savings && isAnnual && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                          {tier.savings}
                        </span>
                      </div>
                    )}

                    {tier.note && (
                      <p className="text-sm text-gray-400 mt-1">{tier.note}</p>
                    )}
                  </div>

                  <Button 
                    className={`w-full ${tier.buttonVariant === 'default' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    disabled={
                      loadingPlan === tier.planType ||
                      tier.buttonText === "Current Plan" ||
                      tier.buttonText === "Contact Sales"
                    }
                    onClick={() => {
                      if (tier.planType === 'free') {
                        window.location.href = '/auth/signup'
                      } else if (tier.planType === 'enterprise') {
                        window.location.href = 'mailto:sales@pixelpilot.com?subject=Enterprise Inquiry'
                      } else if (tier.planType !== 'free' && tier.planType !== 'enterprise') {
                        handleSubscribe(tier.planType)
                      }
                    }}
                  >
                    {loadingPlan === tier.planType && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {tier.buttonText}
                  </Button>

                  <div className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-3">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                        {(feature.includes('credits') || feature.includes('SWE-1')) && (
                          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>


          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              {faqData.map((faq, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700/50 overflow-hidden">
                  <div 
                    className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-700/50 transition-colors"
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  >
                    <span className="text-white font-medium pr-4">{faq.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                  {openFAQ === index && (
                    <div className="px-4 pb-4">
                      <div className="text-gray-300 leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
    </>
  )
}

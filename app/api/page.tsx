"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, Code, Server, Shield, TrendingUp, ArrowRight, Copy, CheckCircle2, Sparkles, Globe, Clock, DollarSign } from "lucide-react"
import Link from "next/link"
import { STRIPE_API_PLANS, API_PLAN_ORDER } from "@/config/stripe-api-plans"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SearchAPIPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleGetStarted = async (tier: string) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to signup
      router.push('/auth/signup?redirect=/api&plan=' + tier)
    } else if (tier === 'free') {
      // Redirect to dashboard to generate API key
      router.push('/dashboard/api')
    } else {
      // Redirect to checkout
      router.push('/api/checkout?plan=' + tier)
    }
  }

  const codeExamples = {
    curl: `curl -X POST https://pipilot-search-api.hanscadx8.workers.dev/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "latest AI news",
    "maxResults": 10,
    "rerank": true
  }'`,
    typescript: `import { PiPilot } from 'pipilot-search-sdk'

const client = new PiPilot({
  apiKey: 'YOUR_API_KEY'
})

const results = await client.search({
  query: 'latest AI news',
  maxResults: 10,
  rerank: true
})`,
    python: `from pipilot import PiPilot

client = PiPilot(api_key='YOUR_API_KEY')

results = client.search(
    query='latest AI news',
    max_results=10,
    rerank=True
)`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              NEW PRODUCT
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              The Cheapest AI Search API
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400">
                for Developers
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Add powerful AI-powered search to your apps. Free tier included.
              Starting at just <span className="text-orange-400 font-bold">$29/month</span> for 100k requests.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8"
                onClick={() => handleGetStarted('free')}
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 text-lg px-8"
                asChild
              >
                <Link href="#pricing">View Pricing</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-gray-300 hover:text-white text-lg px-8"
                asChild
              >
                <a href="https://pipilot-search-api.hanscadx8.workers.dev/health" target="_blank">
                  <Server className="mr-2 w-5 h-5" />
                  API Status
                </a>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Zap, label: 'p50 Latency', value: '<100ms' },
                { icon: Globe, label: 'Cache Hit Rate', value: '90%+' },
                { icon: Shield, label: 'Uptime SLA', value: '99.9%' },
                { icon: DollarSign, label: 'vs Competitors', value: '10x Cheaper' }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-4">
                  <stat.icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Code Demo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Building in Minutes
          </h2>
          <p className="text-gray-400 text-lg">
            Three simple endpoints. Zero configuration required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'Search', endpoint: '/search', desc: 'Web search with AI reranking' },
            { title: 'Extract', endpoint: '/extract', desc: 'Clean content from any URL' },
            { title: 'Smart Search', endpoint: '/smart-search', desc: 'AI Q&A with tool calling' }
          ].map((api, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Server className="w-5 h-5 text-orange-400" />
                <h3 className="text-xl font-bold text-white">{api.title}</h3>
              </div>
              <code className="text-sm text-purple-400">{api.endpoint}</code>
              <p className="text-gray-400 mt-2">{api.desc}</p>
            </Card>
          ))}
        </div>

        {/* Code Examples */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-700">
            {Object.keys(codeExamples).map((lang) => (
              <button
                key={lang}
                className="px-6 py-3 text-gray-400 hover:text-white border-r border-gray-700 last:border-r-0 capitalize"
              >
                {lang}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="p-6 overflow-x-auto">
              <code className="text-sm text-gray-300 font-mono">
                {codeExamples.curl}
              </code>
            </pre>
            <button
              onClick={() => copyToClipboard(codeExamples.curl, 'curl')}
              className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              {copiedCode === 'curl' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {API_PLAN_ORDER.map((tierKey) => {
            const plan = STRIPE_API_PLANS[tierKey]
            const isPopular = plan.popular

            return (
              <Card
                key={tierKey}
                className={`relative bg-gray-800 border-2 ${
                  isPopular ? 'border-orange-500' : 'border-gray-700'
                } p-6 flex flex-col`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                        <span className="text-gray-400">/month</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-white">Custom</span>
                    )}
                  </div>
                  <p className="text-gray-400 mt-2">{plan.requestsDisplay}</p>
                </div>

                <div className="flex-1 mb-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className={`w-full ${
                    isPopular
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white`}
                  onClick={() => handleGetStarted(tierKey)}
                >
                  {plan.cta}
                </Button>
              </Card>
            )
          })}
        </div>

        <p className="text-center text-gray-400 mt-8">
          All plans include 90%+ cache hit rate for maximum cost efficiency.
        </p>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why PiPilot Search API?
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: DollarSign,
              title: '10x Cheaper',
              desc: 'Same quality as Exa, Tavily, Perplexity - but 10x cheaper. Free tier included.'
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              desc: '<100ms p50 latency with 90%+ cache hit rate. Faster than competitors.'
            },
            {
              icon: Shield,
              title: 'Quota Protection',
              desc: 'Smart quota management ensures zero downtime. Graceful degradation under load.'
            },
            {
              icon: Code,
              title: 'Developer First',
              desc: 'Simple REST API, SDKs for TypeScript/Python, MCP server for Claude Desktop.'
            },
            {
              icon: TrendingUp,
              title: '99.9% Uptime',
              desc: 'Built on Cloudflare Workers edge network. Global distribution, high reliability.'
            },
            {
              icon: Sparkles,
              title: 'AI-Powered',
              desc: 'Free AI reranking improves search relevance. Smart search with iterative tool calling.'
            }
          ].map((feature, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 p-6">
              <feature.icon className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              q: 'How is this so cheap?',
              a: 'We use free external services (Jina Reader, DuckDuckGo, a0 LLM) and aggressive caching (90%+ hit rate). This lets us offer the same quality as expensive alternatives at 10x lower cost.'
            },
            {
              q: 'What happens when I hit my quota?',
              a: 'We have smart quota management. At 80% usage, we switch to cache-only mode. Cached results still work instantly. At 95%, service pauses until the next day. Zero downtime for most users.'
            },
            {
              q: 'Can I upgrade or downgrade anytime?',
              a: 'Yes! Upgrade instantly. Downgrade at the end of your billing period. No lock-in contracts.'
            },
            {
              q: 'Do you offer a free trial?',
              a: 'Yes! The free tier includes 10,000 requests/month forever. No credit card required to start.'
            },
            {
              q: 'What about rate limits?',
              a: 'Free: 10 req/min, Starter: 100 req/min, Pro: 500 req/min, Enterprise: Custom. All plans include burst allowance.'
            },
            {
              q: 'Is there an Enterprise plan?',
              a: 'Yes! Contact us for unlimited requests, custom deployment, white-label options, and SLA contracts.'
            }
          ].map((faq, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
              <p className="text-gray-400">{faq.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 border-orange-500/30 p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build with PiPilot Search API?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join developers building the future of AI-powered search.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8"
              onClick={() => handleGetStarted('free')}
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800 text-lg px-8"
              asChild
            >
              <Link href="/docs">Read Documentation</Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
}

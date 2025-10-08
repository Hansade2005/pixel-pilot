"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  Zap, 
  Shield, 
  Globe, 
  Lock, 
  Layers, 
  BarChart3, 
  Clock, 
  Check,
  ArrowRight,
  Code,
  Server,
  FileText,
  Cloud
} from "lucide-react"
import Link from "next/link"

export default function DatabaseProductPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const features = [
    {
      icon: Zap,
      title: "Instant Databases",
      description: "Create production-ready PostgreSQL databases in seconds. No configuration needed."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Row-level security, SSL encryption, and automatic backups keep your data safe."
    },
    {
      icon: Globe,
      title: "Global CDN",
      description: "Deploy to multiple regions worldwide for low-latency access from anywhere."
    },
    {
      icon: Lock,
      title: "Built-in Auth",
      description: "User authentication and authorization out of the box. No third-party needed."
    },
    {
      icon: Layers,
      title: "RESTful & GraphQL APIs",
      description: "Auto-generated APIs for your database. Query with REST or GraphQL instantly."
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Monitor performance, track usage, and optimize your database with live dashboards."
    },
    {
      icon: Clock,
      title: "Point-in-Time Recovery",
      description: "Restore your database to any point in time with automatic backups."
    },
    {
      icon: Code,
      title: "SQL & No-Code",
      description: "Write SQL queries or use our visual query builder. Your choice."
    }
  ]

  const pricingTiers = [
    {
      name: "Free",
      price: 0,
      description: "Perfect for side projects and learning",
      features: [
        "500 MB Database Storage",
        "1 GB File Storage",
        "Unlimited API Requests",
        "Up to 2 databases",
        "Community Support",
        "SSL Encryption",
        "Daily Backups (7 days retention)"
      ],
      cta: "Get Started Free",
      highlighted: false
    },
    {
      name: "Pro",
      price: billingCycle === 'monthly' ? 25 : 20,
      originalPrice: billingCycle === 'yearly' ? 25 : null,
      description: "For production applications",
      features: [
        "8 GB Database Storage",
        "100 GB File Storage",
        "Unlimited API Requests",
        "Unlimited databases",
        "Email Support",
        "Custom Domains",
        "Daily Backups (30 days retention)",
        "Point-in-time Recovery",
        "Real-time Analytics",
        "Connection Pooling"
      ],
      cta: "Start Pro Trial",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For mission-critical applications",
      features: [
        "Unlimited Database Storage",
        "Unlimited File Storage",
        "Unlimited API Requests",
        "Unlimited databases",
        "Priority Support (24/7)",
        "Dedicated Infrastructure",
        "Custom SLA",
        "Advanced Security",
        "On-premise Options",
        "White-label Solutions",
        "Custom Integrations"
      ],
      cta: "Contact Sales",
      highlighted: false
    }
  ]

  const codeExamples = [
    {
      language: "JavaScript",
      code: `import { createClient } from '@yourplatform/client'

const db = createClient({
  url: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY
})

// Query your database
const { data, error } = await db
  .from('users')
  .select('*')
  .limit(10)

// Insert data
await db.from('posts').insert({
  title: 'Hello World',
  content: 'This is my first post!'
})`
    },
    {
      language: "Python",
      code: `from yourplatform import create_client

db = create_client(
    url=os.getenv('DATABASE_URL'),
    api_key=os.getenv('API_KEY')
)

# Query your database
data = db.from_('users').select('*').limit(10).execute()

# Insert data
db.from_('posts').insert({
    'title': 'Hello World',
    'content': 'This is my first post!'
}).execute()`
    }
  ]

  const [selectedLanguage, setSelectedLanguage] = useState(0)

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />
      <div className="absolute inset-0 noise-texture" />

      <Navigation />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
              Database as a Service
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              The fastest way to ship
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                with a database
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Create production-ready PostgreSQL databases in seconds. Built-in authentication, 
              storage, and auto-generated APIs. Focus on building, not infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Start Building Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <FileText className="mr-2 h-5 w-5" />
                  View Documentation
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-white mb-1">50K+</div>
                <div className="text-sm text-gray-400">Databases Created</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                <div className="text-sm text-gray-400">Uptime SLA</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">&lt;100ms</div>
                <div className="text-sm text-gray-400">Avg Response Time</div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Example Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Simple to use, powerful at scale
              </h2>
              <p className="text-gray-400">Get started with just a few lines of code</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Language Tabs */}
              <div className="flex border-b border-gray-700">
                {codeExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedLanguage(index)}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      selectedLanguage === index
                        ? 'text-white bg-gray-700/50 border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {example.language}
                  </button>
                ))}
              </div>

              {/* Code Block */}
              <pre className="p-6 overflow-x-auto">
                <code className="text-sm text-gray-300 font-mono">
                  {codeExamples[selectedLanguage].code}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything you need to ship fast
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                From authentication to storage, we handle the infrastructure so you can focus on building your product
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-colors">
                  <CardHeader>
                    <feature.icon className="h-8 w-8 text-purple-400 mb-4" />
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-gray-400 mb-8">Start free, scale as you grow</p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-4 p-1 bg-gray-800 rounded-lg border border-gray-700">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === 'yearly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <Badge className="ml-2 bg-green-500/20 text-green-300 border-green-500/30">
                    Save 20%
                  </Badge>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`bg-gray-800 border-2 ${
                    tier.highlighted
                      ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105'
                      : 'border-gray-700'
                  }`}
                >
                  <CardHeader>
                    {tier.highlighted && (
                      <Badge className="mb-2 w-fit bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Most Popular
                      </Badge>
                    )}
                    <CardTitle className="text-white text-2xl">{tier.name}</CardTitle>
                    <div className="mt-4">
                      {typeof tier.price === 'number' ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-white">${tier.price}</span>
                          <span className="text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                          {tier.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">${tier.originalPrice}/mo</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-4xl font-bold text-white">{tier.price}</span>
                      )}
                    </div>
                    <CardDescription className="text-gray-400 mt-2">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-gray-300">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={tier.name === 'Enterprise' ? '/enterprise' : '/auth/signup'}>
                      <Button
                        className={`w-full ${
                          tier.highlighted
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to ship faster?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of developers building with our database platform
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

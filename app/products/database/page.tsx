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
  Key, 
  FileJson, 
  Sparkles, 
  Code2, 
  Image, 
  Check,
  ArrowRight,
  Code,
  Server,
  FileText,
  Cloud,
  Table2,
  FileCode
} from "lucide-react"
import Link from "next/link"

export default function DatabaseProductPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const features = [
    {
      icon: Database,
      title: "PostgreSQL Databases",
      description: "Create unlimited databases with 500MB storage each. Powered by Supabase's reliable infrastructure."
    },
    {
      icon: Sparkles,
      title: "AI Schema Generation",
      description: "Describe your data needs in plain English and let AI generate the perfect database schema instantly."
    },
    {
      icon: Table2,
      title: "Visual Table Builder",
      description: "Design tables with our intuitive UI. Support for 10+ data types including JSON, UUID, and timestamps."
    },
    {
      icon: Key,
      title: "API Keys System",
      description: "Secure API keys for external apps. Built-in rate limiting (1000 req/hour) and usage tracking."
    },
    {
      icon: Code2,
      title: "Auto-Generated REST APIs",
      description: "Get instant CRUD endpoints for every table. Full documentation with code examples in 6+ frameworks."
    },
    {
      icon: Image,
      title: "File Storage (500MB)",
      description: "Upload images, PDFs, videos up to 10MB each. Public & private files with signed URLs."
    },
    {
      icon: FileCode,
      title: "API Docs Generator",
      description: "Framework-specific integration guides with your actual database IDs and API keys auto-filled."
    },
    {
      icon: Shield,
      title: "Row Level Security",
      description: "Built-in RLS policies ensure users only access their own data. Secure by default."
    }
  ]

  const pricingTiers = [
    {
      name: "Free",
      price: 0,
      description: "Perfect for learning and testing",
      features: [
        "Unlimited Databases",
        "500MB storage per database",
        "500MB file storage per database",
        "Unlimited API requests",
        "10 API keys per database",
        "AI Schema Generation",
        "Auto-generated REST APIs",
        "API Documentation Generator",
        "Row Level Security",
        "Community Support"
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
        "Everything in Free, plus:",
        "5GB storage per database",
        "5GB file storage per database",
        "Unlimited API keys",
        "Custom domains",
        "Advanced rate limiting controls",
        "Priority email support",
        "Database backups (30 days)",
        "Real-time database subscriptions",
        "Advanced analytics"
      ],
      cta: "Upgrade to Pro",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large-scale applications",
      features: [
        "Everything in Pro, plus:",
        "Custom storage limits",
        "Dedicated support (24/7)",
        "Custom SLA",
        "Advanced security features",
        "Single Sign-On (SSO)",
        "Audit logs",
        "Custom integrations",
        "On-premise deployment options",
        "White-label solutions"
      ],
      cta: "Contact Sales",
      highlighted: false
    }
  ]

  const codeExamples = [
    {
      language: "JavaScript",
      code: `// Fetch all records
const response = await fetch(
  'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/tables/YOUR_TABLE_ID/records',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

const { records } = await response.json();

// Create a record
await fetch(
  'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/tables/YOUR_TABLE_ID/records',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    })
  }
);`
    },
    {
      language: "Python",
      code: `import requests

# Fetch all records
response = requests.get(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/tables/YOUR_TABLE_ID/records',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
)

records = response.json()['records']

# Create a record
requests.post(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/tables/YOUR_TABLE_ID/records',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'data': {
            'name': 'John Doe',
            'email': 'john@example.com'
        }
    }
)`
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
              PostgreSQL databases
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                powered by AI
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Create databases with AI schema generation, get auto-generated REST APIs, 
              500MB storage + file uploads. Secure API keys for external apps. All free forever.
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

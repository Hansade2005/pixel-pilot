"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Building2, Shield, Users, Zap, Globe, Lock, Headphones, Rocket,
  CheckCircle, Star, ArrowRight, Calendar, TrendingUp, Award,
  Server, Database, Cloud, Settings, BarChart3, Target,
  FileText, MessageSquare, Phone, Mail, ChevronDown, X,
  CreditCard
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"

export default function EnterprisePage() {
  const enterpriseFeatures = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 Type II compliant with advanced security features, audit trails, and data encryption at rest and in transit.",
      benefits: ["End-to-end encryption", "Role-based access control", "Audit logging", "SSO integration"]
    },
    {
      icon: Users,
      title: "Advanced Team Management",
      description: "Comprehensive user management with granular permissions, team hierarchies, and collaborative workflows.",
      benefits: ["User roles & permissions", "Team hierarchies", "Project templates", "Resource management"]
    },
    {
      icon: Server,
      title: "Dedicated Infrastructure",
      description: "Private cloud infrastructure with dedicated resources, custom SLAs, and priority support channels.",
      benefits: ["Dedicated servers", "99.9% uptime SLA", "Priority support", "Custom deployments"]
    },
    {
      icon: Zap,
      title: "Custom Integrations",
      description: "Full API access and custom integrations with your existing enterprise tool ecosystem.",
      benefits: ["RESTful API", "Webhook support", "Custom connectors", "Enterprise integrations"]
    },
    {
      icon: Database,
      title: "Data Governance",
      description: "Complete control over your data with custom retention policies, backup schedules, and compliance frameworks.",
      benefits: ["Custom data retention", "Automated backups", "GDPR compliance", "Data portability"]
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive usage analytics, performance metrics, and ROI tracking for enterprise deployments.",
      benefits: ["Usage analytics", "Performance metrics", "ROI tracking", "Custom reporting"]
    }
  ]

  const complianceStandards = [
    { name: "SOC 2 Type II", status: "Certified", icon: Shield },
    { name: "GDPR", status: "Compliant", icon: Lock },
    { name: "HIPAA", status: "Compliant", icon: FileText },
    { name: "ISO 27001", status: "Certified", icon: Award },
    { name: "PCI DSS", status: "Compliant", icon: CreditCard },
    { name: "CSA STAR", status: "Certified", icon: Cloud }
  ]

  const caseStudies = [
    {
      company: "TechCorp Global",
      industry: "Technology",
      challenge: "Scaling development team from 50 to 200+ engineers",
      solution: "AI-powered development acceleration",
      results: ["60% faster development cycles", "40% reduction in bugs", "300% increase in productivity"],
      logo: "TC"
    },
    {
      company: "FinanceFlow Inc",
      industry: "Financial Services",
      challenge: "Modernizing legacy banking applications",
      solution: "Enterprise-grade AI development platform",
      results: ["90% faster modernization", "99.99% system uptime", "50% cost reduction"],
      logo: "FF"
    },
    {
      company: "HealthTech Solutions",
      industry: "Healthcare",
      challenge: "HIPAA-compliant application development",
      solution: "Secure enterprise development environment",
      results: ["100% HIPAA compliance", "75% faster development", "Zero security incidents"],
      logo: "HT"
    }
  ]

  const pricingTiers = [
    {
      name: "Enterprise Starter",
      price: "Custom",
      description: "For small to medium enterprises getting started with AI development",
      features: [
        "Up to 50 users",
        "Basic enterprise security",
        "Standard integrations",
        "Business hours support",
        "Core analytics",
        "Basic compliance"
      ],
      popular: false
    },
    {
      name: "Enterprise Professional",
      price: "Custom",
      description: "For growing enterprises with advanced development needs",
      features: [
        "Up to 200 users",
        "Advanced security & compliance",
        "Custom integrations",
        "Priority support",
        "Advanced analytics",
        "Dedicated infrastructure",
        "Custom training"
      ],
      popular: true
    },
    {
      name: "Enterprise Elite",
      price: "Custom",
      description: "For large enterprises requiring full customization and white-label solutions",
      features: [
        "Unlimited users",
        "Full custom security",
        "White-label solution",
        "24/7 dedicated support",
        "Custom analytics & reporting",
        "Private cloud deployment",
        "On-site training & consulting",
        "Custom SLA agreements"
      ],
      popular: false
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
          <div className="text-center mb-20">
            <div className="flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full heart-gradient flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Enterprise-Grade
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                AI Development
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-4xl mx-auto mb-8 leading-relaxed">
              Scale your development teams with production-ready AI tools, enterprise security,
              and dedicated support. Trusted by Fortune 500 companies worldwide.
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                <div className="text-gray-400">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-gray-400">Enterprise Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">50M+</div>
                <div className="text-gray-400">Lines of Code Generated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-400">Dedicated Support</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Enterprise Demo
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700 px-8 py-4 text-lg">
                <MessageSquare className="w-5 h-5 mr-2" />
                Contact Sales Team
              </Button>
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Enterprise-Grade Features</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Built for scale, security, and performance. Everything your enterprise needs to accelerate development.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {enterpriseFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-7 h-7 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-3">{feature.title}</CardTitle>
                          <CardDescription className="text-gray-300 leading-relaxed">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {feature.benefits.map((benefit, benefitIndex) => (
                          <div key={benefitIndex} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Compliance & Security */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Compliance & Security</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Enterprise-grade security and compliance frameworks you can trust.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {complianceStandards.map((standard, index) => {
                const IconComponent = standard.icon
                return (
                  <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">{standard.name}</h3>
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        {standard.status}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Case Studies */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Success Stories</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                See how leading enterprises transformed their development workflows with Pixel Pilot.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {caseStudies.map((study, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {study.logo}
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{study.company}</CardTitle>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                          {study.industry}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">Challenge</h4>
                        <p className="text-gray-300 text-sm">{study.challenge}</p>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Solution</h4>
                        <p className="text-gray-300 text-sm">{study.solution}</p>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Results</h4>
                        <div className="space-y-1">
                          {study.results.map((result, resultIndex) => (
                            <div key={resultIndex} className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-green-400" />
                              <span className="text-green-300 text-sm">{result}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Enterprise Pricing */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Enterprise Pricing</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Custom pricing designed for your organization's specific needs and scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, index) => (
                <Card key={index} className={`relative bg-gray-800/50 border-gray-700/50 backdrop-blur-sm ${
                  tier.popular ? 'border-purple-500/50 ring-2 ring-purple-500/20' : ''
                }`}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-white text-2xl mb-2">{tier.name}</CardTitle>
                    <div className="text-4xl font-bold text-white mb-2">{tier.price}</div>
                    <CardDescription className="text-gray-300">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${
                        tier.popular
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                      } text-white`}
                      size="lg"
                    >
                      Contact Sales
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl p-12 backdrop-blur-sm border border-purple-500/20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join the hundreds of enterprise teams already scaling their development with AI.
                Schedule a personalized demo and see how Pixel Pilot can transform your workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Schedule Demo</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Book a personalized demonstration tailored to your enterprise needs.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Book Demo
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Contact Sales</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Speak with our enterprise sales team about custom pricing and solutions.
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Request Proposal</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Get a customized proposal with pricing, timeline, and implementation plan.
                  </p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Get Proposal
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Questions? We're here to help. Reach out to our team anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us: (555) 123-4567
                </Button>
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email: enterprise@pixelpilot.com
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

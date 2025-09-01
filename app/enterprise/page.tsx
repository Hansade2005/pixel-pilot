"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Shield, Users, Zap, Globe, Lock, Headphones, Rocket } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function EnterprisePage() {
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
                <Building2 className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Enterprise Solutions
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
              Scale your development team with AI-powered tools designed for enterprise needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                Book a Demo
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Enterprise Security</CardTitle>
                <CardDescription className="text-gray-300">
                  SOC 2 Type II compliant with advanced security features and audit trails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white">Team Management</CardTitle>
                <CardDescription className="text-gray-300">
                  Advanced user roles, permissions, and group-based access control.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Custom Integrations</CardTitle>
                <CardDescription className="text-gray-300">
                  API access and custom integrations with your existing tools and workflows.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center mb-4">
                  <Headphones className="w-6 h-6 text-red-400" />
                </div>
                <CardTitle className="text-white">Dedicated Support</CardTitle>
                <CardDescription className="text-gray-300">
                  24/7 priority support with dedicated account managers and onboarding.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-yellow-600/20 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Global Infrastructure</CardTitle>
                <CardDescription className="text-gray-300">
                  Multi-region deployment with 99.9% uptime SLA and disaster recovery.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <CardTitle className="text-white">Compliance</CardTitle>
                <CardDescription className="text-gray-300">
                  GDPR, HIPAA, and industry-specific compliance frameworks supported.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Social Proof */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">Trusted by Enterprise Teams</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {['Fortune 500', 'Tech Giants', 'Startups', 'Agencies'].map((category, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">100+</div>
                  <div className="text-gray-300">{category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Scale?</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of enterprise teams building faster with AI-powered development.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

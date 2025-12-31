import { Metadata } from 'next'
import Link from 'next/link'
import { Trophy, Star, Users, TrendingUp, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'First AI App Builder in Canada: PiPilot Pioneers AI Development | 2025',
  description: 'PiPilot was the first AI app builder in Canada. Learn how we pioneered conversational app development and continue to lead the Canadian AI space.',
  keywords: 'first AI app builder Canada, PiPilot Canada, AI app development Canada, pioneering AI tools',
  openGraph: {
    title: 'First AI App Builder in Canada | PiPilot',
    description: 'As Canada\'s first AI app builder, PiPilot revolutionized app development. Join the pioneers.',
  },
}

export default function FirstAIAppBuilderCanada() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full mb-6">
          <Trophy className="w-5 h-5 mr-2" />
          Pioneering AI Innovation in Canada
        </div>
        <h1 className="text-5xl font-bold mb-6">First AI App Builder in Canada</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          PiPilot was the first company in Canada to bring AI-powered app development to developers.
          Since our launch in 2023, we've been leading the charge in conversational app creation.
        </p>
        <div className="flex justify-center space-x-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">2023</div>
            <div className="text-sm text-gray-600">Founded</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">10,000+</div>
            <div className="text-sm text-gray-600">Canadian Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">#1</div>
            <div className="text-sm text-gray-600">In Canada</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-3xl font-bold mb-6">Our Pioneering Journey</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-600 rounded-full p-2 mr-4 mt-1">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg">July 2025: The Beginning</h3>
                <p className="text-gray-600">Launched as Canada's first AI app builder, introducing conversational development to the market.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-green-100 text-green-600 rounded-full p-2 mr-4 mt-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg"> September 2025: Rapid Growth</h3>
                <p className="text-gray-600">Expanded to serve thousands of Canadian developers with advanced AI features and team collaboration.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-100 text-purple-600 rounded-full p-2 mr-4 mt-1">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg">December 2025: Market Leadership</h3>
                <p className="text-gray-600">Established as the #1 AI app builder in Canada, with enterprise solutions and global recognition.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-red-50 p-8 rounded-lg">
          <h3 className="text-2xl font-bold mb-6 text-center">Why PiPilot Leads Canada</h3>
          <ul className="space-y-4">
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>First-mover advantage in AI app development</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Deep understanding of Canadian developer needs</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Compliance with Canadian data regulations</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Support for Canadian time zones and languages</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Partnerships with Canadian tech companies</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Multi-framework support: Next.js, Vite+React, Expo</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span>Advanced integrations: GitHub, Vercel, Supabase, Stripe</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
        <h2 className="text-3xl font-bold mb-6 text-center">What Makes Us Canada's #1 AI App Builder</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">Innovation First</h3>
            <p className="text-gray-600">We pioneered AI app building in Canada and continue to innovate</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🇨🇦</div>
            <h3 className="text-xl font-bold mb-2">Canadian Focus</h3>
            <p className="text-gray-600">Built by Canadians, for Canadians, with local market understanding</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Proven Results</h3>
            <p className="text-gray-600">Thousands of successful Canadian apps built with our platform</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6">Join Canada's AI Pioneers</h2>
        <p className="text-lg text-gray-600 mb-8">
          Be part of the revolution that started in Canada. Build your next app with the country's leading AI app builder.
        </p>
        <Link href="/" className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-600 transition-colors">
          Start Building with PiPilot
        </Link>
      </div>
    </div>
  )
}
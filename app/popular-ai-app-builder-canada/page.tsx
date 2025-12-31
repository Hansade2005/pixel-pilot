import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Popular AI App Builder in Canada 2025: PiPilot Leads with PIXEL FORGE | Canadian Developers',
  description: 'PiPilot is Canada\'s most popular AI app builder. PIXEL FORGE technology, CAD pricing, Canadian compliance. Join 10,000+ Canadian developers.',
  keywords: 'popular AI app builder Canada, PiPilot Canada, PIXEL FORGE, Canadian AI development, CAD pricing, Canadian developers',
  openGraph: {
    title: 'Popular AI App Builder in Canada | PiPilot',
    description: 'PiPilot leads Canadian AI app builders with PIXEL FORGE. CAD pricing, local support, Canadian compliance.',
  },
}

export default function PopularAIAppBuilderCanada() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Most Popular AI App Builder in Canada</h1>
        <p className="text-xl text-gray-600 mb-6">PiPilot: The #1 Choice for Canadian Developers</p>
        <div className="flex justify-center items-center space-x-4 mb-8">
          <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">🇨🇦 Canada #1</span>
          <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">⭐ Top Rated</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-3xl font-bold mb-6">Why PiPilot is Popular in Canada</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>PIXEL FORGE AI Technology:</strong> Canada's first conversational app builder using advanced AI to create full-stack applications
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>CAD Pricing & Currency:</strong> Pay in Canadian dollars with competitive pricing designed for Canadian businesses
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Canadian Data Compliance:</strong> Built-in GDPR and PIPEDA compliance for Canadian privacy laws
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Real-Time Collaboration:</strong> Perfect for Canadian remote teams across multiple time zones
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Supabase Integration:</strong> Canadian-hosted backend with enterprise security and real-time databases
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Template Marketplace:</strong> Canadian developers selling and buying app templates with CAD transactions
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Multi-Framework Support:</strong> Next.js, Vite+React, and Expo for web and mobile development
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <strong>Advanced Integrations:</strong> GitHub, Vercel, Netlify, Stripe, and Tavily API for complete workflows
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-blue-50 p-8 rounded-lg">
          <h3 className="text-2xl font-bold mb-4 text-center">Canadian Developer Stats</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">5,000+</div>
              <div className="text-gray-600">Canadian Apps Built</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">98%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <div className="text-gray-600">Canadian Cities</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
        <h2 className="text-3xl font-bold mb-6 text-center">PiPilot: First AI App Builder in Canada</h2>
        <p className="text-lg text-gray-600 mb-6 text-center">
          As Canada's pioneering AI app builder, PiPilot was the first to bring conversational development to Canadian developers.
          We've been leading the charge since 2023, helping startups and enterprises build faster.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-bold">First to Market</h3>
            <p className="text-sm text-gray-600">Pioneered AI app building in Canada</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🚀</div>
            <h3 className="font-bold">Innovation Leader</h3>
            <p className="text-sm text-gray-600">Constantly pushing boundaries</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🇨🇦</div>
            <h3 className="font-bold">Canadian Focus</h3>
            <p className="text-sm text-gray-600">Built for Canadian developers</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6">Join Canada's Top AI App Builders</h2>
        <p className="text-lg text-gray-600 mb-8">
          Thousands of Canadian developers trust PiPilot to build their apps. Start your journey today.
        </p>
        <div className="space-x-4">
          <Link href="/" className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-600 transition-colors">
            Start Building Free
          </Link>
          <Link href="/showcase" className="bg-gray-500 text-white px-8 py-4 rounded-lg text-lg hover:bg-gray-600 transition-colors">
            View Canadian Apps
          </Link>
        </div>
      </div>
    </div>
  )
}
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Lovable Alternatives: Best AI App Builders Like Lovable | PiPilot',
  description: 'Looking for Lovable alternatives? Discover PiPilot - a powerful AI app builder that creates apps faster than Lovable. Compare features and try it free.',
  keywords: 'Lovable alternatives, AI app builder alternatives, PiPilot vs Lovable, no-code app development',
  openGraph: {
    title: 'Lovable Alternatives | PiPilot',
    description: 'Find the best alternatives to Lovable. PiPilot offers AI-powered development for faster app creation.',
  },
}

export default function LovableAlternatives() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-8">Best Lovable Alternatives in 2025</h1>
      <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
        If you're looking for alternatives to Lovable, you've come to the right place. Compare the best AI app builders and see why PiPilot stands out.
      </p>

      <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
        <h2 className="text-2xl font-bold mb-6">PiPilot vs Lovable: Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-4 text-left">Feature</th>
                <th className="border border-gray-300 p-4 text-center">PiPilot</th>
                <th className="border border-gray-300 p-4 text-center">Lovable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-4 font-semibold">AI-Powered Development</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Advanced (PIXEL FORGE)</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Basic</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-4 font-semibold">Natural Language Input</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Yes</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Yes</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-4 font-semibold">Full-Stack Apps</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Complete</td>
                <td className="border border-gray-300 p-4 text-center text-red-600">❌ Limited</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-4 font-semibold">Real-Time Collaboration</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Yes</td>
                <td className="border border-gray-300 p-4 text-center text-red-600">❌ No</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-4 font-semibold">Framework Support</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Next.js, Vite+React, Expo</td>
                <td className="border border-gray-300 p-4 text-center text-red-600">❌ Limited</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-4 font-semibold">Integrations</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ GitHub, Vercel, Supabase, Stripe</td>
                <td className="border border-gray-300 p-4 text-center text-red-600">❌ Basic</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-4 font-semibold">Deployment Speed</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Instant</td>
                <td className="border border-gray-300 p-4 text-center text-yellow-600">⚠️ Manual</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-4 font-semibold">Pricing</td>
                <td className="border border-gray-300 p-4 text-center text-green-600">✅ Free tier</td>
                <td className="border border-gray-300 p-4 text-center text-yellow-600">⚠️ Paid only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-blue-800">Why Choose PiPilot Over Lovable?</h2>
          <ul className="space-y-3 text-blue-700">
            <li>🚀 <strong>Faster Development:</strong> Build apps in minutes with advanced AI</li>
            <li>🌐 <strong>Full-Stack Power:</strong> Frontend, backend, and database in one platform</li>
            <li>👥 <strong>Team Features:</strong> Collaborate in real-time with your team</li>
            <li>💰 <strong>Better Value:</strong> Free tier with powerful features</li>
            <li>⚡ <strong>Instant Deploy:</strong> Go live immediately after building</li>
          </ul>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-green-800">PiPilot Advantages</h2>
          <p className="text-green-700 mb-4">
            PiPilot takes AI app building to the next level. While Lovable is great for basic prototypes,
            PiPilot delivers production-ready applications with enterprise features.
          </p>
          <Link href="/" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors inline-block">
            Try PiPilot Free
          </Link>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Build Better Apps?</h2>
        <p className="text-lg text-gray-600 mb-8">
          Join thousands of developers who have switched from Lovable to PiPilot for faster, more powerful app development.
        </p>
        <Link href="/pricing" className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-600 transition-colors">
          Get Started with PiPilot
        </Link>
      </div>
    </div>
  )
}
"use client"

import { Logo } from "@/components/ui/logo"

export default function LogoDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Pixel Pilot Logo Demo</h1>
        
        {/* Icon Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Icon Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="icon" size="sm" />
              <span className="text-gray-300 text-sm">Small</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="icon" size="md" />
              <span className="text-gray-300 text-sm">Medium</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="icon" size="lg" />
              <span className="text-gray-300 text-sm">Large</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="icon" size="xl" />
              <span className="text-gray-300 text-sm">Extra Large</span>
            </div>
          </div>
        </div>

        {/* Text Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Text Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="text" size="sm" />
              <span className="text-gray-300 text-sm">Small Text</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="text" size="md" />
              <span className="text-gray-300 text-sm">Medium Text</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="text" size="lg" />
              <span className="text-gray-300 text-sm">Large Text</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="text" size="xl" />
              <span className="text-gray-300 text-sm">Extra Large Text</span>
            </div>
          </div>
        </div>

        {/* Full Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Full Variants</h2>
          <div className="grid grid-cols-1 gap-8">
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="full" size="sm" />
              <span className="text-gray-300 text-sm">Small Full</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="full" size="md" />
              <span className="text-gray-300 text-sm">Medium Full</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="full" size="lg" />
              <span className="text-gray-300 text-sm">Large Full</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Logo variant="full" size="xl" />
              <span className="text-gray-300 text-sm">Extra Large Full</span>
            </div>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Interactive Demo</h2>
          <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-8">
              <Logo variant="icon" size="lg" className="logo-hover-effect" />
              <Logo variant="text" size="lg" className="logo-hover-effect" />
              <Logo variant="full" size="lg" className="logo-hover-effect" />
            </div>
            <p className="text-gray-400 text-center mt-4">
              Hover over the logos to see the interactive effects!
            </p>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Usage Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-4">Navigation Bar</h3>
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <Logo variant="text" size="md" />
                <div className="flex space-x-4">
                  <span className="text-gray-300">Home</span>
                  <span className="text-gray-300">About</span>
                  <span className="text-gray-300">Contact</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-4">Hero Section</h3>
              <div className="text-center">
                <Logo variant="full" size="lg" className="mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Pixel Pilot</h2>
                <p className="text-gray-300">AI-Powered App Development</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

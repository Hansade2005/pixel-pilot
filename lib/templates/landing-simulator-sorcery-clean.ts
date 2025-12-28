import type { File } from '../storage-manager'

export const landingSimulatorSorceryFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import GameCreator from './components/GameCreator'
import GamePreview from './components/GamePreview'
import Features from './components/Features'
import Footer from './components/Footer'

function App() {
  const [gameData, setGameData] = useState(null)
  const [currentStep, setCurrentStep] = useState('creator')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Header />
      <Hero />

      <div className="container mx-auto px-4 py-16">
        {currentStep === 'creator' && (
          <GameCreator
            onGameCreated={(data) => {
              setGameData(data)
              setCurrentStep('preview')
            }}
          />
        )}

        {currentStep === 'preview' && gameData && (
          <GamePreview
            gameData={gameData}
            onBack={() => setCurrentStep('creator')}
          />
        )}
      </div>

      <Features />
      <Footer />
    </div>
  )
}

export default App`,
    fileType: 'tsx',
    type: 'tsx',
    size: 600,
    isDirectory: false
  },
  {
    name: 'src/components/Header.tsx',
    path: 'src/components/Header.tsx',
    content: `import React, { useState } from 'react'
import { Menu, X, Wand2, Sparkles, Gamepad2 } from 'lucide-react'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Creator', href: '#creator' },
    { name: 'Features', href: '#features' },
    { name: 'About', href: '#about' },
  ]

  return (
    <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md z-50 border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Landing Simulator
              </h1>
              <p className="text-xs text-purple-400">Sorcery Edition</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-purple-400 font-medium transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Start Creating</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-purple-400 font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Start Creating</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/components/Hero.tsx',
    path: 'src/components/Hero.tsx',
    content: `import React from 'react'
import { ArrowRight, Wand2, Sparkles, Zap, Gamepad2 } from 'lucide-react'

const Hero: React.FC = () => {
  return (
    <section id="home" className="pt-20 pb-16 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-indigo-900/80"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full mb-6">
            <Wand2 className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-400">AI-Powered Game Creation</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Create Games
            </span>
            <br />
            <span className="text-white">With Just a Prompt</span>
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your wildest ideas into fully playable games using the power of AI.
            From fantasy adventures to puzzle games, bring any concept to life in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 font-semibold text-lg shadow-lg hover:shadow-purple-500/25">
              <Sparkles className="h-5 w-5" />
              <span>Start Creating Magic</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="px-8 py-4 border-2 border-purple-500/50 text-purple-400 rounded-full hover:bg-purple-500/10 hover:border-purple-400 transition-all duration-200 flex items-center space-x-2 font-semibold">
              <Gamepad2 className="h-5 w-5" />
              <span>View Examples</span>
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Creation</h3>
              <p className="text-gray-300 text-sm">Advanced AI transforms your ideas into playable games</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-300 text-sm">Create complete games in under 30 seconds</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Infinite Possibilities</h3>
              <p className="text-gray-300 text-sm">From RPGs to puzzles, bring any game concept to life</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Magical Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-16 h-16 bg-pink-500/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
    </section>
  )
}

export default Hero`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1600,
    isDirectory: false
  },
  {
    name: 'src/components/GameCreator.tsx',
    path: 'src/components/GameCreator.tsx',
    content: `import React, { useState } from 'react'
import { Wand2, Sparkles, Loader2, Gamepad2 } from 'lucide-react'

interface GameCreatorProps {
  onGameCreated: (data: any) => void
}

const GameCreator: React.FC<GameCreatorProps> = ({ onGameCreated }) => {
  const [prompt, setPrompt] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!prompt.trim()) return

    setIsCreating(true)

    // Simulate AI game creation
    setTimeout(() => {
      const mockGameData = {
        title: prompt.split(' ').slice(0, 3).join(' '),
        genre: 'Adventure',
        description: \`A magical \${prompt.toLowerCase()}\`,
        features: ['AI Generated', 'Playable', 'Customizable'],
        createdAt: new Date().toISOString()
      }

      setIsCreating(false)
      onGameCreated(mockGameData)
    }, 3000)
  }

  const examplePrompts = [
    "A space adventure where you pilot a starship through asteroid fields",
    "A fantasy RPG with magic spells and mythical creatures",
    "A puzzle game where you match colorful gems to clear levels",
    "A racing game with futuristic vehicles on alien planets"
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">Describe Your Game</h2>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Tell our AI what kind of game you want to create. Be as creative and detailed as you like!
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-lg font-semibold text-white mb-3">
              Game Description
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream game... e.g., 'A magical forest adventure where players solve riddles to unlock ancient treasures'"
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isCreating}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCreate}
              disabled={!prompt.trim() || isCreating}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 px-8 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 font-semibold text-lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Creating Magic...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-6 w-6" />
                  <span>Create Game</span>
                </>
              )}
            </button>

            <button className="px-6 py-4 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-all duration-200">
              <Sparkles className="h-5 w-5 inline mr-2" />
              Random Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="mt-12">
        <h3 className="text-xl font-semibold text-white mb-6 text-center">Try These Examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examplePrompts.map((examplePrompt, index) => (
            <button
              key={index}
              onClick={() => setPrompt(examplePrompt)}
              className="bg-white/5 border border-white/10 rounded-lg p-4 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
              disabled={isCreating}
            >
              <div className="flex items-start space-x-3">
                <Gamepad2 className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 group-hover:text-white transition-colors text-sm leading-relaxed">
                  {examplePrompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GameCreator`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  {
    name: 'src/components/GamePreview.tsx',
    path: 'src/components/GamePreview.tsx',
    content: `import React from 'react'
import { ArrowLeft, Play, Download, Share2, Star } from 'lucide-react'

interface GamePreviewProps {
  gameData: any
  onBack: () => void
}

const GamePreview: React.FC<GamePreviewProps> = ({ gameData, onBack }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Creator</span>
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
        {/* Game Header */}
        <div className="p-8 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{gameData.title}</h1>
              <p className="text-gray-300 mb-4">{gameData.description}</p>
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  {gameData.genre}
                </span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Play Now</span>
              </button>
              <button className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <button className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Game Preview */}
        <div className="p-8">
          <div className="bg-gray-900 rounded-lg h-96 flex items-center justify-center mb-8">
            <div className="text-center">
              <Play className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Your Game is Ready!</h3>
              <p className="text-gray-300">Click play to start your AI-generated adventure</p>
            </div>
          </div>

          {/* Game Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameData.features.map((feature: string, index: number) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <h4 className="text-lg font-semibold text-white mb-2">{feature}</h4>
                <p className="text-gray-300 text-sm">
                  {feature === 'AI Generated' && 'Created using advanced AI algorithms'}
                  {feature === 'Playable' && 'Fully functional game mechanics'}
                  {feature === 'Customizable' && 'Modify and enhance your creation'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePreview`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/components/Features.tsx',
    path: 'src/components/Features.tsx',
    content: `import React from 'react'
import { Wand2, Zap, Sparkles, Gamepad2, Palette, Trophy } from 'lucide-react'

const Features: React.FC = () => {
  const features = [
    {
      icon: Wand2,
      title: 'AI-Powered Creation',
      description: 'Our advanced AI understands your vision and transforms it into a complete, playable game.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Create fully functional games in under 30 seconds. No waiting, no compromises.'
    },
    {
      icon: Sparkles,
      title: 'Endless Possibilities',
      description: 'From RPGs to puzzles, platformers to adventures - create any game genre imaginable.'
    },
    {
      icon: Gamepad2,
      title: 'Ready to Play',
      description: 'Every generated game is immediately playable with smooth controls and engaging gameplay.'
    },
    {
      icon: Palette,
      title: 'Customizable Assets',
      description: 'Personalize your game with custom sprites, sounds, and visual themes.'
    },
    {
      icon: Trophy,
      title: 'Share & Compete',
      description: 'Share your creations with friends and compete in community challenges.'
    }
  ]

  return (
    <section id="features" className="py-16 bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Everything you need to create, customize, and share amazing games with our AI-powered platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/components/Footer.tsx',
    path: 'src/components/Footer.tsx',
    content: `import React from 'react'
import { Wand2, Twitter, Github, Discord } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/50 backdrop-blur-sm border-t border-white/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Landing Simulator
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              Create games with just a prompt using the power of AI. Transform your ideas into reality.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <Discord className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Game Creator</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Templates</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Community</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Showcase</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2025 Landing Simulator Sorcery. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1000,
    isDirectory: false
  }
]

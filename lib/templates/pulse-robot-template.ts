import type { File } from '../storage-manager'

export const pulseRobotTemplateFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'index.html',
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pulse Robot - Where Code Meets Motion</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    fileType: 'html',
    type: 'html',
    size: 300,
    isDirectory: false
  },
  {
    name: 'vite.config.ts',
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    fileType: 'ts',
    type: 'ts',
    size: 100,
    isDirectory: false
  },
  {
    name: 'tailwind.config.ts',
    path: 'tailwind.config.ts',
    content: `import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config`,
    fileType: 'ts',
    type: 'ts',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'postcss.config.mjs',
    path: 'postcss.config.mjs',
    content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;`,
    fileType: 'mjs',
    type: 'mjs',
    size: 150,
    isDirectory: false
  },
  {
    name: 'tsconfig.json',
    path: 'tsconfig.json',
    content: `{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}`,
    fileType: 'json',
    type: 'json',
    size: 200,
    isDirectory: false
  },
  {
    name: 'tsconfig.app.json',
    path: 'tsconfig.app.json',
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}`,
    fileType: 'json',
    type: 'json',
    size: 400,
    isDirectory: false
  },
  {
    name: 'tsconfig.node.json',
    path: 'tsconfig.node.json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}`,
    fileType: 'json',
    type: 'json',
    size: 250,
    isDirectory: false
  },
  {
    name: 'eslint.config.js',
    path: 'eslint.config.js',
    content: `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)`,
    fileType: 'js',
    type: 'js',
    size: 500,
    isDirectory: false
  },
  {
    name: 'src/main.tsx',
    path: 'src/main.tsx',
    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    fileType: 'tsx',
    type: 'tsx',
    size: 150,
    isDirectory: false
  },
  {
    name: 'src/index.css',
    path: 'src/index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`,
    fileType: 'css',
    type: 'css',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import Products from './components/Products'
import Technology from './components/Technology'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <Hero />
      <Features />
      <Products />
      <Technology />
      <Contact />
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
import { Menu, X, Cpu, Zap } from 'lucide-react'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'Products', href: '#products' },
    { name: 'Technology', href: '#technology' },
    { name: 'Contact', href: '#contact' },
  ]

  return (
    <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md z-50 border-b border-cyan-500/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Pulse Robot
              </h1>
              <p className="text-xs text-cyan-400">Where Code Meets Motion</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-cyan-400 font-medium transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Explore</span>
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
                  className="text-gray-300 hover:text-cyan-400 font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Explore</span>
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
import { ArrowRight, Play, Cpu } from 'lucide-react'

const Hero: React.FC = () => {
  return (
    <section id="home" className="pt-20 pb-16 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full mb-6">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-cyan-400">Next-Gen Robotics</span>
              </div>

              <h1 className="text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Pulse
                </span>
                <br />
                <span className="text-white">Robotics</span>
              </h1>

              <p className="text-xl text-gray-300 mb-8 max-w-lg leading-relaxed">
                Where artificial intelligence meets mechanical precision.
                Experience the future of robotics with our cutting-edge autonomous systems.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 font-semibold text-lg">
                  <span>Discover More</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button className="px-8 py-4 border-2 border-cyan-500/50 text-cyan-400 rounded-full hover:bg-cyan-500/10 hover:border-cyan-400 transition-all duration-200 flex items-center space-x-2 font-semibold">
                  <Play className="h-5 w-5" />
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">500+</div>
                  <div className="text-gray-400">Projects Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">50+</div>
                  <div className="text-gray-400">Countries Served</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
                  <div className="text-gray-400">Support Available</div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Cpu className="h-16 w-16 text-white" />
                  </div>
                  <p className="text-cyan-400 font-medium">Interactive 3D Robot Model</p>
                  <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
        </div>
      </div>
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
    name: 'src/components/Features.tsx',
    path: 'src/components/Features.tsx',
    content: `import React from 'react'
import { Brain, Zap, Shield, Cog, Wifi, Cpu } from 'lucide-react'

const Features: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Advanced machine learning algorithms enable our robots to learn, adapt, and make intelligent decisions in real-time.',
      color: 'text-cyan-400'
    },
    {
      icon: Zap,
      title: 'Lightning Fast Performance',
      description: 'High-performance processors and optimized algorithms deliver unparalleled speed and precision in every operation.',
      color: 'text-blue-400'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Military-grade encryption and security protocols ensure your data and operations remain completely secure.',
      color: 'text-green-400'
    },
    {
      icon: Cog,
      title: 'Modular Design',
      description: 'Easily customizable and upgradable components allow for seamless integration and future-proofing.',
      color: 'text-purple-400'
    },
    {
      icon: Wifi,
      title: 'IoT Connectivity',
      description: 'Seamless integration with IoT ecosystems for comprehensive automation and remote monitoring capabilities.',
      color: 'text-pink-400'
    },
    {
      icon: Cpu,
      title: 'Edge Computing',
      description: 'On-device processing reduces latency and enables operation in environments with limited connectivity.',
      color: 'text-orange-400'
    }
  ]

  return (
    <section id="features" className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Cutting-Edge Features</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Our robotics platform combines the latest in AI, hardware, and software engineering
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className={\`h-8 w-8 \${feature.color}\`} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>

              {/* Animated border */}
              <div className="mt-6 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>

        {/* Technical Specs */}
        <div className="mt-16 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-2xl p-8 border border-cyan-500/20">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Technical Specifications</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">10ms</div>
              <div className="text-gray-400">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">256-bit</div>
              <div className="text-gray-400">Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
              <div className="text-gray-400">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  {
    name: 'src/components/Products.tsx',
    path: 'src/components/Products.tsx',
    content: `import React from 'react'
import { ExternalLink, Cpu, Zap, Shield } from 'lucide-react'

const Products: React.FC = () => {
  const products = [
    {
      name: 'Atlas Prime',
      category: 'Industrial Robot',
      description: 'Heavy-duty robotic arm designed for manufacturing and assembly lines with precision accuracy.',
      features: ['6-Axis Movement', '500kg Payload', '0.1mm Precision', 'IP67 Protection'],
      price: 'Starting at $89,999',
      image: 'https://via.placeholder.com/400x300?text=Atlas+Prime'
    },
    {
      name: 'Nexus AI Controller',
      category: 'Control System',
      description: 'Advanced AI-powered control system with machine learning capabilities for autonomous operation.',
      features: ['Neural Networks', 'Real-time Learning', 'API Integration', 'Cloud Sync'],
      price: 'Starting at $24,999',
      image: 'https://via.placeholder.com/400x300?text=Nexus+AI'
    },
    {
      name: 'Pulse Vision System',
      category: 'Computer Vision',
      description: 'High-precision computer vision system with object recognition and tracking capabilities.',
      features: ['4K Resolution', 'Object Detection', 'Depth Sensing', 'Night Vision'],
      price: 'Starting at $15,999',
      image: 'https://via.placeholder.com/400x300?text=Pulse+Vision'
    },
    {
      name: 'Quantum Drive',
      category: 'Motion Control',
      description: 'Ultra-precise motion control system with quantum-level accuracy for critical applications.',
      features: ['Nanometer Precision', 'Vibration Dampening', 'Temperature Control', 'Self-Calibration'],
      price: 'Starting at $49,999',
      image: 'https://via.placeholder.com/400x300?text=Quantum+Drive'
    }
  ]

  return (
    <section id="products" className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Our Products</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover our comprehensive range of robotic solutions designed for every industry
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {products.map((product, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <div className="h-48 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Robot+Product'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full border border-cyan-500/30">
                    {product.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{product.name}</h3>
                  <span className="text-cyan-400 font-semibold">{product.price}</span>
                </div>

                <p className="text-gray-400 mb-6">{product.description}</p>

                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">Key Features:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {product.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold">
                  <span>Learn More</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-2xl p-8 border border-cyan-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">Need a Custom Solution?</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Our engineering team can design and build custom robotic solutions tailored to your specific requirements.
            </p>
            <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 font-semibold">
              <Zap className="h-5 w-5" />
              <span>Contact Engineering Team</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Products`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1600,
    isDirectory: false
  },
  {
    name: 'src/components/Technology.tsx',
    path: 'src/components/Technology.tsx',
    content: `import React from 'react'
import { Code, Database, Cloud, Cpu, Network, Shield } from 'lucide-react'

const Technology: React.FC = () => {
  const technologies = [
    {
      icon: Code,
      title: 'Advanced Algorithms',
      description: 'Proprietary algorithms for motion planning, object recognition, and autonomous decision-making.',
      details: ['Path Optimization', 'Collision Avoidance', 'Learning Algorithms', 'Real-time Processing']
    },
    {
      icon: Database,
      title: 'Big Data Analytics',
      description: 'Process and analyze massive datasets to improve performance and predict maintenance needs.',
      details: ['Predictive Analytics', 'Performance Monitoring', 'Data Visualization', 'Trend Analysis']
    },
    {
      icon: Cloud,
      title: 'Cloud Integration',
      description: 'Seamless cloud connectivity for remote monitoring, updates, and centralized management.',
      details: ['Remote Management', 'OTA Updates', 'Data Sync', 'Multi-site Support']
    },
    {
      icon: Network,
      title: 'IoT Ecosystem',
      description: 'Complete IoT integration for smart factory and industrial automation applications.',
      details: ['Device Connectivity', 'Protocol Support', 'Sensor Networks', 'Edge Computing']
    },
    {
      icon: Shield,
      title: 'Cybersecurity',
      description: 'Enterprise-grade security measures to protect your robotic systems and data.',
      details: ['End-to-End Encryption', 'Access Control', 'Intrusion Detection', 'Compliance Ready']
    },
    {
      icon: Cpu,
      title: 'Edge Computing',
      description: 'On-device processing capabilities for low-latency, high-reliability operations.',
      details: ['Local Processing', 'Offline Operation', 'Reduced Latency', 'Bandwidth Optimization']
    }
  ]

  return (
    <section id="technology" className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Technology Stack</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Our cutting-edge technology combines AI, robotics, and software engineering
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {technologies.map((tech, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <tech.icon className="h-6 w-6 text-cyan-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{tech.title}</h3>
              <p className="text-gray-400 mb-4">{tech.description}</p>

              <ul className="space-y-2">
                {tech.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Architecture Diagram */}
        <div className="mt-16 bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">System Architecture</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Cpu className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Hardware Layer</h4>
              <p className="text-gray-400 text-sm">Precision actuators, sensors, and mechanical systems</p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto">
                <Code className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Software Layer</h4>
              <p className="text-gray-400 text-sm">AI algorithms, control systems, and application logic</p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto">
                <Cloud className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Cloud Layer</h4>
              <p className="text-gray-400 text-sm">Data analytics, remote management, and connectivity</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Technology`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  {
    name: 'src/components/Contact.tsx',
    path: 'src/components/Contact.tsx',
    content: `import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react'

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <section id="contact" className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Ready to transform your operations with cutting-edge robotics? Let's discuss your project.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Let's Build Something Amazing</h3>
                <p className="text-gray-400 mb-8">
                  Our team of robotics experts is ready to help you implement the perfect solution for your business needs.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Call Us</h4>
                    <p className="text-gray-400">+1 (555) 123-ROBOT</p>
                    <p className="text-gray-400">Mon-Fri: 9AM - 6PM PST</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Email Us</h4>
                    <p className="text-gray-400">hello@pulserobot.com</p>
                    <p className="text-gray-400">sales@pulserobot.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Visit Us</h4>
                    <p className="text-gray-400">123 Innovation Drive</p>
                    <p className="text-gray-400">Silicon Valley, CA 94043</p>
                    <p className="text-gray-400">United States</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700/50">
              <h3 className="text-2xl font-bold text-white mb-6">Send Message</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    placeholder="Tell us about your project and requirements..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1800,
    isDirectory: false
  },
  {
    name: 'src/components/Footer.tsx',
    path: 'src/components/Footer.tsx',
    content: `import React from 'react'
import { Github, Twitter, Linkedin, Mail, Cpu } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Pulse Robot</h1>
                <p className="text-xs text-cyan-400">Where Code Meets Motion</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Leading the future of robotics with AI-powered autonomous systems and cutting-edge technology.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Products</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Atlas Prime</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Nexus AI Controller</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Pulse Vision System</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Quantum Drive</a></li>
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Technology</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">AI & Machine Learning</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Computer Vision</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Edge Computing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">IoT Integration</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Support</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm">
              © 2025 Pulse Robot. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/vite-env.d.ts',
    path: 'src/vite-env.d.ts',
    content: '/// <reference types="vite/client" />',
    fileType: 'd.ts',
    type: 'd.ts',
    size: 50,
    isDirectory: false
  }
]

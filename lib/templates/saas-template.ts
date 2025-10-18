import type { File } from '../storage-manager'

export const saasTemplateFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  // Environment configuration
  {
    name: '.env.local',
    path: '.env.local',
    content: `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
VITE_APP_NAME=SaaS Template
VITE_APP_URL=http://localhost:5173`,
    fileType: 'env',
    type: 'env',
    size: 400,
    isDirectory: false
  },
  {
    name: '.env.example',
    path: '.env.example',
    content: `# Copy this file to .env.local and fill in your values

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
VITE_APP_NAME=SaaS Template
VITE_APP_URL=http://localhost:5173`,
    fileType: 'env',
    type: 'env',
    size: 400,
    isDirectory: false
  },
  // Supabase client setup
  {
    name: 'src/lib/supabase.ts',
    path: 'src/lib/supabase.ts',
    content: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Database helpers
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  return { data, error }
}

export const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}`,
    fileType: 'ts',
    type: 'ts',
    size: 1200,
    isDirectory: false
  },
  // Stripe integration
  {
    name: 'src/lib/stripe.ts',
    path: 'src/lib/stripe.ts',
    content: `import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Missing Stripe publishable key')
}

export const stripePromise = loadStripe(stripePublishableKey)

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 3 projects',
      'Basic templates',
      'Community support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    stripePriceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited projects',
      'Premium templates',
      'Advanced analytics',
      'Priority support',
      'Custom integrations'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    stripePriceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Pro',
      'White-label solution',
      'Dedicated support',
      'Custom development',
      'SLA guarantee'
    ]
  }
}

export const createCheckoutSession = async (priceId: string, userId: string) => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      userId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const session = await response.json()
  return session
}

export const createCustomerPortalSession = async (customerId: string) => {
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create portal session')
  }

  const session = await response.json()
  return session
}`,
    fileType: 'ts',
    type: 'ts',
    size: 1000,
    isDirectory: false
  },
  // Main App component
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'

// Components
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-right" />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

// Note: All shadcn/ui components are available through the base template
// Import them as needed: import { Button } from '@/components/ui/button'

export default App`,
    fileType: 'tsx',
    type: 'tsx',
    size: 800,
    isDirectory: false
  },
  // Auth context
  {
    name: 'src/contexts/AuthContext.tsx',
    path: 'src/contexts/AuthContext.tsx',
    content: `import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getUserProfile } from '../lib/supabase'

interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_status?: string
  subscription_plan?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await getUserProfile(userId)
      if (error) {
        console.error('Error loading profile:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  // Protected Route component
  {
    name: 'src/components/ProtectedRoute.tsx',
    path: 'src/components/ProtectedRoute.tsx',
    content: `import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute`,
    fileType: 'tsx',
    type: 'tsx',
    size: 300,
    isDirectory: false
  },
  // Enhanced Navbar with dark mode and animations
  {
    name: 'src/components/Navbar.tsx',
    path: 'src/components/Navbar.tsx',
    content: `import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User, LogOut, Moon, Sun, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Pricing', href: '/pricing' },
  ]

  return (
    <motion.nav
      className={\`fixed top-0 w-full z-50 transition-all duration-300 \${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-white/10'
          : 'bg-transparent'
      }\`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
          >
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SaaSFlow
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={item.href}
                  className={\`text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200\`}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}

            {/* Theme Toggle */}
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </motion.button>

            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                  >
                    Dashboard
                  </Link>
                </motion.div>

                {/* User Menu */}
                <div className="relative">
                  <motion.button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                  </motion.button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {profile?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>

                        <Link
                          to="/profile"
                          className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Profile Settings
                        </Link>

                        <Link
                          to="/dashboard"
                          className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Dashboard
                        </Link>

                        <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                          <button
                            onClick={() => {
                              handleSignOut()
                              setIsMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                          >
                            <LogOut className="h-4 w-4 inline mr-2" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/auth"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </motion.button>

            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={item.href}
                      className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}

                {user ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <Link
                        to="/dashboard"
                        className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <Link
                        to="/profile"
                        className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Profile
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <button
                        onClick={() => {
                          handleSignOut()
                          setIsMenuOpen(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/auth"
                      className="block px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 mx-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

export default Navbar`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2500,
    isDirectory: false
  },
  // Enhanced landing page with animations and dark mode
  {
    name: 'src/pages/Landing.tsx',
    path: 'src/pages/Landing.tsx',
    content: `import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useAnimation, useInView } from 'framer-motion'
import { useIntersectionObserver } from 'react-intersection-observer'
import {
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Zap,
  Moon,
  Sun,
  Sparkles,
  Rocket,
  Shield,
  BarChart3,
  Globe,
  Cpu,
  Award,
  MapPin,
  Clock
} from 'lucide-react'

const Landing: React.FC = () => {
  const [isDark, setIsDark] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const features = [
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with end-to-end encryption and SOC 2 compliance.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Rocket,
      title: 'Lightning Fast',
      description: 'Optimized performance with global CDN and edge computing technology.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Deploy worldwide with 99.9% uptime and automatic scaling.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Cpu,
      title: 'AI-Powered',
      description: 'Leverage cutting-edge AI to automate and optimize your workflows.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights with real-time dashboards and reporting.',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Award,
      title: 'Award Winning',
      description: 'Recognized by industry leaders for innovation and user experience.',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CTO',
      company: 'TechFlow',
      content: 'This platform transformed our entire development workflow. The AI features are incredible.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Product Lead',
      company: 'InnovateLabs',
      content: 'The best investment we made this year. Outstanding ROI and customer support.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      rating: 5
    },
    {
      name: 'Emma Thompson',
      role: 'CEO',
      company: 'StartupX',
      content: 'From MVP to scale in 6 months. This platform made it possible.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      rating: 5
    }
  ]

  const stats = [
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '99.9%', label: 'Uptime', icon: Shield },
    { value: '24/7', label: 'Support', icon: Zap },
    { value: '500+', label: 'Integrations', icon: Globe }
  ]

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className={\`min-h-screen transition-colors duration-300 \${isDark ? 'dark bg-gray-900' : 'bg-white'}\`}>
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300"
      >
        {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
      </button>

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{
            left: mousePosition.x * 0.02,
            top: mousePosition.y * 0.02,
            transform: 'translate(-50%, -50%)'
          }}
        />
        <div
          className="absolute w-80 h-80 bg-gradient-to-r from-pink-400 to-orange-500 rounded-full opacity-15 blur-3xl animate-pulse"
          style={{
            right: mousePosition.x * 0.01,
            bottom: mousePosition.y * 0.01,
            transform: 'translate(50%, 50%)',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className={\`absolute inset-0 \${isDark ? 'bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}\`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-8"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className={\`text-sm font-medium \${isDark ? 'text-blue-300' : 'text-blue-600'}\`}>
                ✨ Next-Gen SaaS Platform
              </span>
            </motion.div>

            <motion.h1
              className={\`text-5xl md:text-7xl font-bold mb-8 leading-tight \${isDark ? 'text-white' : 'text-gray-900'}\`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Build the Future of
              <motion.span
                className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: '200% 200%' }}
              >
                Digital Innovation
              </motion.span>
            </motion.h1>

            <motion.p
              className={\`text-xl md:text-2xl mb-12 max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              The complete SaaS solution with AI-powered features, enterprise security,
              and everything you need to scale your business globally.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/auth"
                  className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/pricing"
                  className={\`inline-flex items-center px-8 py-4 border-2 font-semibold rounded-xl transition-all duration-300 \${isDark ? 'border-white/30 text-white hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}\`}
                >
                  View Pricing
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className={\`text-center \${isDark ? 'text-white' : 'text-gray-900'}\`}
                  variants={fadeInUp}
                >
                  <motion.div
                    className={\`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r \${stat.icon === Users ? 'from-blue-500 to-cyan-500' : stat.icon === Shield ? 'from-green-500 to-emerald-500' : stat.icon === Zap ? 'from-yellow-500 to-orange-500' : 'from-purple-500 to-pink-500'} flex items-center justify-center\`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className={\`text-sm \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}>{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Features Section with Advanced Cards */}
      <section className={\`py-24 \${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Powerful Features for
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modern Teams
              </span>
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Everything you need to build, scale, and succeed with enterprise-grade features
              and world-class performance.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={\`group relative overflow-hidden \${isDark ? 'bg-gray-800/60 backdrop-blur-xl border border-white/10' : 'bg-white/80 backdrop-blur-xl border border-gray-200/50'} p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2\`}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                {/* Background gradient overlay */}
                <div className={\`absolute inset-0 bg-gradient-to-br \${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500\`} />

                {/* Icon with enhanced styling */}
                <motion.div
                  className={\`relative w-20 h-20 rounded-3xl bg-gradient-to-r \${feature.gradient} flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg\`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <feature.icon className="h-10 w-10 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-3xl bg-white/20 group-hover:bg-white/30 transition-colors duration-300" />
                </motion.div>

                <h3 className={\`text-2xl font-bold mb-4 \${isDark ? 'text-white' : 'text-gray-900'} group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300\`}>
                  {feature.title}
                </h3>
                <p className={\`text-lg leading-relaxed mb-6 \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                  {feature.description}
                </p>

                {/* Enhanced hover indicator */}
                <div className="flex items-center justify-between">
                  <motion.div
                    className={\`text-sm font-semibold \${isDark ? 'text-blue-300' : 'text-blue-600'} opacity-0 group-hover:opacity-100 transition-opacity duration-300\`}
                    initial={{ x: -20 }}
                    whileHover={{ x: 0 }}
                  >
                    Learn More →
                  </motion.div>
                  <motion.div
                    className={\`w-8 h-8 rounded-full bg-gradient-to-r \${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center\`}
                    whileHover={{ scale: 1.1 }}
                  >
                    <ArrowRight className="h-4 w-4 text-white" />
                  </motion.div>
                </div>

                {/* Animated border */}
                <div className={\`absolute inset-0 rounded-3xl bg-gradient-to-r \${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 -z-10 blur-xl\`} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product Showcase Section with Image API */}
      <section className={\`py-24 \${isDark ? 'bg-gray-900' : 'bg-white'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              See It In Action
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Experience our platform through beautiful, modern interfaces designed for productivity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Main Feature Image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className={\`relative overflow-hidden rounded-3xl shadow-2xl \${isDark ? 'bg-gray-800' : 'bg-white'} p-2\`}>
                <img
                  src="https://api.a0.dev/assets/image?text=SaaS dashboard interface, modern UI, analytics charts, user management, notifications panel, responsive design, clean layout&aspect=16:10&seed=123"
                  alt="Dashboard Interface"
                  className="w-full h-auto rounded-2xl"
                />
                <div className={\`absolute inset-0 bg-gradient-to-t \${isDark ? 'from-gray-900/20' : 'from-white/10'} to-transparent rounded-2xl\`} />
              </div>
              <div className={\`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-xl\`}>
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className={\`p-6 rounded-2xl \${isDark ? 'bg-gray-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200/50'} backdrop-blur-sm\`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className={\`text-xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                      Advanced Analytics
                    </h3>
                    <p className={\`text-base \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                      Real-time insights with beautiful charts and comprehensive reporting tools.
                    </p>
                  </div>
                </div>
              </div>

              <div className={\`p-6 rounded-2xl \${isDark ? 'bg-gray-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200/50'} backdrop-blur-sm\`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className={\`text-xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                      Team Collaboration
                    </h3>
                    <p className={\`text-base \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                      Seamless collaboration with real-time updates and team management features.
                    </p>
                  </div>
                </div>
              </div>

              <div className={\`p-6 rounded-2xl \${isDark ? 'bg-gray-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200/50'} backdrop-blur-sm\`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className={\`text-xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                      Enterprise Security
                    </h3>
                    <p className={\`text-base \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                      Bank-level security with end-to-end encryption and compliance standards.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Additional Screenshots Gallery */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className={\`group relative overflow-hidden rounded-2xl shadow-xl \${isDark ? 'bg-gray-800' : 'bg-white'} p-2 hover:shadow-2xl transition-all duration-300\`}>
              <img
                src="https://api.a0.dev/assets/image?text=Mobile app interface, responsive design, touch controls, user profile, settings menu, modern UI&aspect=9:16&seed=456"
                alt="Mobile Interface"
                className="w-full h-auto rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
              <div className={\`absolute inset-0 bg-gradient-to-t \${isDark ? 'from-gray-900/30' : 'from-black/20'} to-transparent rounded-xl\`} />
              <div className={\`absolute bottom-4 left-4 text-white font-semibold\`}>
                Mobile Experience
              </div>
            </div>

            <div className={\`group relative overflow-hidden rounded-2xl shadow-xl \${isDark ? 'bg-gray-800' : 'bg-white'} p-2 hover:shadow-2xl transition-all duration-300\`}>
              <img
                src="https://api.a0.dev/assets/image?text=Data visualization dashboard, charts graphs, KPI metrics, performance analytics, business intelligence&aspect=16:9&seed=789"
                alt="Analytics Dashboard"
                className="w-full h-auto rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
              <div className={\`absolute inset-0 bg-gradient-to-t \${isDark ? 'from-gray-900/30' : 'from-black/20'} to-transparent rounded-xl\`} />
              <div className={\`absolute bottom-4 left-4 text-white font-semibold\`}>
                Analytics Hub
              </div>
            </div>

            <div className={\`group relative overflow-hidden rounded-2xl shadow-xl \${isDark ? 'bg-gray-800' : 'bg-white'} p-2 hover:shadow-2xl transition-all duration-300\`}>
              <img
                src="https://api.a0.dev/assets/image?text=Team collaboration interface, chat messages, file sharing, project management, workflow automation&aspect=16:9&seed=101"
                alt="Collaboration Tools"
                className="w-full h-auto rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
              <div className={\`absolute inset-0 bg-gradient-to-t \${isDark ? 'from-gray-900/30' : 'from-black/20'} to-transparent rounded-xl\`} />
              <div className={\`absolute bottom-4 left-4 text-white font-semibold\`}>
                Team Workspace
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className={\`py-24 \${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Simple, Transparent Pricing
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Choose the perfect plan for your business. Upgrade or downgrade at any time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <motion.div
              className={\`relative group \${isDark ? 'bg-gray-800/60 backdrop-blur-xl border border-white/10' : 'bg-white/80 backdrop-blur-xl border border-gray-200/50'} p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500\`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="text-center">
                <h3 className={\`text-2xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                  Starter
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-blue-600">$29</span>
                  <span className={\`text-lg \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}>/month</span>
                </div>
                <p className={\`text-base mb-8 \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                  Perfect for small teams getting started
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Up to 10 team members</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Basic analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Email support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>5GB storage</span>
                </li>
              </ul>

              <motion.button
                className={\`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 \${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}\`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </motion.div>

            {/* Professional Plan - Popular */}
            <motion.div
              className={\`relative group bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 text-white\`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </span>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2 text-white">
                  Professional
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">$99</span>
                  <span className="text-lg text-blue-100">/month</span>
                </div>
                <p className="text-base mb-8 text-blue-100">
                  Best for growing businesses
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-sm text-blue-100">Up to 50 team members</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-sm text-blue-100">Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-sm text-blue-100">Priority support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-sm text-blue-100">100GB storage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-sm text-blue-100">API access</span>
                </li>
              </ul>

              <motion.button
                className="w-full py-3 px-6 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Free Trial
              </motion.button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              className={\`relative group \${isDark ? 'bg-gray-800/60 backdrop-blur-xl border border-white/10' : 'bg-white/80 backdrop-blur-xl border border-gray-200/50'} p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500\`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="text-center">
                <h3 className={\`text-2xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                  Enterprise
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-purple-600">$299</span>
                  <span className={\`text-lg \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}>/month</span>
                </div>
                <p className={\`text-base mb-8 \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                  For large organizations
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Unlimited team members</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Custom analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>24/7 phone support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Unlimited storage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className={\`text-sm \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>Custom integrations</span>
                </li>
              </ul>

              <motion.button
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Sales
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Integration Cards Section */}
      <section className={\`py-24 \${isDark ? 'bg-gray-900' : 'bg-white'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Integrates With Your Favorite Tools
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Connect with 500+ popular tools and services to streamline your workflow.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { name: 'Slack', icon: '💬', color: 'from-purple-500 to-pink-500' },
              { name: 'Google', icon: '🔍', color: 'from-blue-500 to-cyan-500' },
              { name: 'GitHub', icon: '📦', color: 'from-gray-600 to-gray-800' },
              { name: 'Stripe', icon: '💳', color: 'from-purple-600 to-indigo-600' },
              { name: 'Zapier', icon: '⚡', color: 'from-orange-500 to-red-500' },
              { name: 'Notion', icon: '📝', color: 'from-gray-700 to-gray-900' },
              { name: 'Figma', icon: '🎨', color: 'from-pink-500 to-rose-500' },
              { name: 'Discord', icon: '🎮', color: 'from-indigo-500 to-purple-500' },
              { name: 'Trello', icon: '📋', color: 'from-blue-600 to-blue-800' },
              { name: 'Dropbox', icon: '📦', color: 'from-blue-500 to-blue-700' },
              { name: 'Zoom', icon: '📹', color: 'from-blue-500 to-blue-600' },
              { name: 'Mailchimp', icon: '📧', color: 'from-yellow-500 to-orange-500' }
            ].map((integration, index) => (
              <motion.div
                key={integration.name}
                className={\`group relative \${isDark ? 'bg-gray-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200/50'} p-6 rounded-2xl hover:shadow-xl transition-all duration-300 backdrop-blur-sm\`}
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.05 }}
              >
                <div className={\`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r \${integration.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300\`}>
                  {integration.icon}
                </div>
                <h3 className={\`text-sm font-semibold text-center \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                  {integration.name}
                </h3>
                <div className={\`absolute inset-0 rounded-2xl bg-gradient-to-r \${integration.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300\`} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={\`py-24 \${isDark ? 'bg-gray-900' : 'bg-white'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Trusted by Industry Leaders
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Join thousands of companies worldwide who have transformed their business with our platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className={\`group relative overflow-hidden \${isDark ? 'bg-gray-800/60 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500\`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Quote icon */}
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity duration-300">
                  <span className="text-white text-lg font-bold">"</span>
                </div>

                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    </motion.div>
                  ))}
                  <span className={\`ml-3 text-sm font-medium \${isDark ? 'text-yellow-300' : 'text-yellow-600'}\`}>
                    {testimonial.rating}.0
                  </span>
                </div>

                <motion.p
                  className={\`text-lg mb-8 italic leading-relaxed \${isDark ? 'text-gray-300' : 'text-gray-700'}\`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  "{testimonial.content}"
                </motion.p>

                <motion.div
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="relative">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full border-3 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white"></div>
                  </div>
                  <div className="ml-4">
                    <h4 className={\`font-bold text-lg \${isDark ? 'text-white' : 'text-gray-900'} group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300\`}>
                      {testimonial.name}
                    </h4>
                    <p className={\`text-sm \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}>
                      {testimonial.role}
                    </p>
                    <p className={\`text-sm font-medium \${isDark ? 'text-blue-300' : 'text-blue-600'}\`}>
                      {testimonial.company}
                    </p>
                  </div>
                </motion.div>

                {/* Decorative elements */}
                <div className="absolute -bottom-2 -right-2 w-20 h-20 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl group-hover:blur-2xl transition-all duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section with Avatar Cards */}
      <section className={\`py-24 \${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Meet Our Team
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Passionate experts dedicated to building the future of digital innovation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'Alex Chen',
                role: 'CEO & Founder',
                bio: 'Former Google PM with 10+ years in SaaS',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
                social: { linkedin: '#', twitter: '#' }
              },
              {
                name: 'Sarah Rodriguez',
                role: 'CTO',
                bio: 'Ex-Microsoft engineer, AI & ML expert',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=200&h=200&fit=crop&crop=face',
                social: { linkedin: '#', github: '#' }
              },
              {
                name: 'Marcus Kim',
                role: 'Head of Design',
                bio: 'Award-winning UX designer from IDEO',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
                social: { linkedin: '#', dribbble: '#' }
              },
              {
                name: 'Emma Thompson',
                role: 'VP of Product',
                bio: 'Product leader from Stripe & Airbnb',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
                social: { linkedin: '#', twitter: '#' }
              }
            ].map((member, index) => (
              <motion.div
                key={member.name}
                className={\`group relative \${isDark ? 'bg-gray-800/60 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 text-center\`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Avatar with ring animation */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
                </div>

                <h3 className={\`text-xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'} group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300\`}>
                  {member.name}
                </h3>
                <p className={\`text-sm font-semibold mb-3 \${isDark ? 'text-blue-300' : 'text-blue-600'}\`}>
                  {member.role}
                </p>
                <p className={\`text-sm mb-6 leading-relaxed \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                  {member.bio}
                </p>

                {/* Social links */}
                <div className="flex justify-center space-x-4 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  {Object.entries(member.social).map(([platform, url]) => (
                    <motion.a
                      key={platform}
                      href={url}
                      className={\`w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm hover:scale-110 transition-transform duration-200\`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {platform === 'linkedin' && '💼'}
                      {platform === 'twitter' && '🐦'}
                      {platform === 'github' && '💻'}
                      {platform === 'dribbble' && '🎨'}
                    </motion.a>
                  ))}
                </div>

                {/* Decorative gradient */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Stats Section with Enhanced Cards */}
      <section className={\`py-24 \${isDark ? 'bg-gray-900' : 'bg-white'}\`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={\`text-4xl md:text-5xl font-bold mb-6 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
              Trusted by Industry Leaders
            </h2>
            <p className={\`text-xl max-w-3xl mx-auto \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
              Join thousands of companies transforming their business with our platform.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { value: '50K+', label: 'Happy Customers', icon: Users, color: 'from-blue-500 to-cyan-500' },
              { value: '99.9%', label: 'Uptime SLA', icon: Shield, color: 'from-green-500 to-emerald-500' },
              { value: '24/7', label: 'Expert Support', icon: Zap, color: 'from-yellow-500 to-orange-500' },
              { value: '500+', label: 'Integrations', icon: Globe, color: 'from-purple-500 to-pink-500' },
              { value: '150+', label: 'Countries', icon: MapPin, color: 'from-indigo-500 to-purple-500' },
              { value: '10M+', label: 'API Calls', icon: Cpu, color: 'from-red-500 to-pink-500' },
              { value: '5min', label: 'Setup Time', icon: Clock, color: 'from-teal-500 to-cyan-500' },
              { value: '4.9/5', label: 'User Rating', icon: Star, color: 'from-yellow-400 to-orange-500' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className={\`group relative \${isDark ? 'bg-gray-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200/50'} p-6 rounded-2xl hover:shadow-xl transition-all duration-300 backdrop-blur-sm text-center\`}
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.05 }}
              >
                <div className={\`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r \${stat.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg\`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className={\`text-3xl font-bold mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                  {stat.value}
                </div>
                <div className={\`text-sm font-medium \${isDark ? 'text-gray-300' : 'text-gray-600'}\`}>
                  {stat.label}
                </div>
                <div className={\`absolute inset-0 rounded-2xl bg-gradient-to-r \${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300\`} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className={\`absolute inset-0 \${isDark ? 'bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'}\`}>
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Join thousands of companies who have accelerated their growth with our platform.
              Start your free trial today.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/auth"
                className="inline-flex items-center px-10 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-300 shadow-2xl"
              >
                Start Your Free Trial
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </motion.div>

            <p className="mt-6 text-white/80">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Landing`,
    fileType: 'tsx',
    type: 'tsx',
    size: 4000,
    isDirectory: false
  },
  // Auth page
  {
    name: 'src/pages/Auth.tsx',
    path: 'src/pages/Auth.tsx',
    content: `import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { signIn, signUp } from '../lib/supabase'
import { toast } from 'sonner'

const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')
          return
        }

        const { error } = await signUp(email, password)
        if (error) {
          toast.error(error.message)
        } else {
          toast.success('Check your email for the confirmation link')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          toast.error(error.message)
        } else {
          toast.success('Welcome back!')
          navigate('/dashboard')
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link to="/" className="text-sm text-blue-600 hover:text-blue-500">
              Back to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Auth`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1800,
    isDirectory: false
  },
  // Dashboard page
  {
    name: 'src/pages/Dashboard.tsx',
    path: 'src/pages/Dashboard.tsx',
    content: `import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { SUBSCRIPTION_PLANS } from '../lib/stripe'
import { CreditCard, Users, Activity, TrendingUp } from 'lucide-react'

const Dashboard: React.FC = () => {
  const { profile } = useAuth()

  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Projects',
      value: '56',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Revenue',
      value: '$12,345',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Plan',
      value: profile?.subscription_plan || 'Free',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const currentPlan = SUBSCRIPTION_PLANS[profile?.subscription_plan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's what's happening with your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={\`p-3 rounded-full \${stat.bgColor}\`}>
                <stat.icon className={\`h-6 w-6 \${stat.color}\`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Plan */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Current Plan: {currentPlan.name}
            </h3>
            <p className="text-gray-600 mt-1">
              {currentPlan.price === 0
                ? 'Free forever'
                : \`$\${currentPlan.price}/month\`
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Features included:</div>
            <ul className="text-sm text-gray-600">
              {currentPlan.features.slice(0, 3).map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Plan</h3>
          <p className="text-gray-600 mb-4">
            Unlock premium features and unlimited usage.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
            View Plans
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Billing</h3>
          <p className="text-gray-600 mb-4">
            View invoices, update payment method, and manage subscriptions.
          </p>
          <button className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors">
            Billing Portal
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Documentation</h3>
          <p className="text-gray-600 mb-4">
            Integrate with our API to automate your workflows.
          </p>
          <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  // Pricing page
  {
    name: 'src/pages/Pricing.tsx',
    path: 'src/pages/Pricing.tsx',
    content: `import React, { useState } from 'react'
import { Check, Star } from 'lucide-react'
import { SUBSCRIPTION_PLANS, createCheckoutSession } from '../lib/stripe'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

const Pricing: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null)
  const { user } = useAuth()

  const handleSubscribe = async (planId: string, stripePriceId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }

    setLoading(planId)
    try {
      const session = await createCheckoutSession(stripePriceId, user.id)
      if (session.url) {
        window.location.href = session.url
      }
    } catch (error) {
      toast.error('Failed to create checkout session')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600">
          Start free and scale as you grow. All plans include our core features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
          <div
            key={plan.id}
            className={\`bg-white rounded-lg shadow-sm border border-gray-200 p-8 \${
              plan.id === 'pro' ? 'border-blue-500 relative' : ''
            }\`}
          >
            {plan.id === 'pro' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {plan.price === 0 ? (
                  'Free'
                ) : (
                  <>
                    <span className="text-2xl">$</span>
                    {plan.price}
                    <span className="text-lg text-gray-600">/month</span>
                  </>
                )}
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => plan.stripePriceId && handleSubscribe(plan.id, plan.stripePriceId)}
              disabled={loading === plan.id}
              className={\`w-full py-3 px-6 rounded-md font-semibold transition-colors \${
                plan.id === 'pro'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : plan.price === 0
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed\`}
            >
              {loading === plan.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mx-auto"></div>
              ) : plan.price === 0 ? (
                'Get Started'
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-16">
        <p className="text-gray-600 mb-4">
          All plans include a 14-day free trial. No credit card required.
        </p>
        <p className="text-sm text-gray-500">
          Need a custom plan? <a href="#" className="text-blue-600 hover:text-blue-800">Contact us</a>
        </p>
      </div>
    </div>
  )
}

export default Pricing`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  // Profile page
  {
    name: 'src/pages/Profile.tsx',
    path: 'src/pages/Profile.tsx',
    content: `import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile } from '../lib/supabase'
import { createCustomerPortalSession } from '../lib/stripe'
import { toast } from 'sonner'

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    avatar_url: profile?.avatar_url || ''
  })

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const { error } = await updateUserProfile(user.id, formData)
      if (error) {
        toast.error(error.message)
      } else {
        await refreshProfile()
        toast.success('Profile updated successfully')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!profile?.stripe_customer_id) {
      toast.error('No billing information found')
      return
    }

    try {
      const session = await createCustomerPortalSession(profile.stripe_customer_id)
      if (session.url) {
        window.location.href = session.url
      }
    } catch (error) {
      toast.error('Failed to open billing portal')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Personal Information
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Subscription & Billing */}
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Subscription
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Current Plan</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {profile?.subscription_plan || 'Free'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-lg font-semibold text-green-600">
                    {profile?.subscription_status || 'Active'}
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Manage Billing
                </button>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Account Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                  Export Data
                </button>
                <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  // Not Found page
  {
    name: 'src/pages/NotFound.tsx',
    path: 'src/pages/NotFound.tsx',
    content: `import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Home className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default NotFound`,
    fileType: 'tsx',
    type: 'tsx',
    size: 400,
    isDirectory: false
  },
  // Footer component
  // README for setup instructions
  {
    name: 'README-SaaS-Template.md',
    path: 'README-SaaS-Template.md',
    content: `# SaaS Template - Complete Solution

A fully-featured SaaS application template with authentication, payments, and dashboard built with React, Supabase, and Stripe.

## 🚀 Features

- ✅ **Authentication** - Sign up, sign in, password reset with Supabase Auth
- ✅ **User Management** - Profile management, user roles
- ✅ **Subscription System** - Multiple pricing tiers with Stripe
- ✅ **Payment Processing** - Secure payments with Stripe Checkout
- ✅ **Dashboard** - User dashboard with analytics and settings
- ✅ **Responsive Design** - Mobile-first design with Tailwind CSS
- ✅ **TypeScript** - Full type safety throughout the application
- ✅ **Modern UI** - Beautiful components with shadcn/ui

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe (Checkout + Customer Portal)
- **State Management:** React Query (TanStack)
- **Icons:** Lucide React
- **Notifications:** Sonner

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Supabase Account** (for backend)
4. **Stripe Account** (for payments)

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment variables:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in your environment variables:

\`\`\`env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
VITE_APP_NAME=SaaS Template
VITE_APP_URL=http://localhost:5173
\`\`\`

### 2. Supabase Setup

1. **Create a new Supabase project**
2. **Go to Authentication → Settings**
3. **Configure your site URL:** \`http://localhost:5173\`
4. **Create the following tables:**

#### \`profiles\` table:
\`\`\`sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
\`\`\`

#### \`subscriptions\` table:
\`\`\`sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT,
  plan_name TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
\`\`\`

### 3. Stripe Setup

1. **Create a Stripe account** and get your API keys
2. **Create products and prices:**
   - **Free Plan:** No Stripe price needed
   - **Pro Plan:** Create a monthly subscription price (e.g., $29/month)
   - **Enterprise Plan:** Create a monthly subscription price (e.g., $99/month)
3. **Update the price IDs** in \`src/lib/stripe.ts\`
4. **Set up webhooks** for subscription events
5. **Configure the Customer Portal** in Stripe Dashboard

### 4. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:5173\` to see your SaaS application!

## 📁 Project Structure

\`\`\`
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation component
│   ├── Footer.tsx      # Footer component
│   └── ProtectedRoute.tsx # Route protection
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── lib/               # Utilities and configurations
│   ├── supabase.ts    # Supabase client setup
│   └── stripe.ts      # Stripe integration
├── pages/             # Page components
│   ├── Landing.tsx    # Landing/Home page
│   ├── Auth.tsx       # Authentication page
│   ├── Dashboard.tsx  # User dashboard
│   ├── Pricing.tsx    # Pricing plans
│   ├── Profile.tsx    # User profile
│   └── NotFound.tsx   # 404 page
└── App.tsx           # Main application component
\`\`\`

## 🔧 Key Features Explained

### Authentication Flow
- **Sign Up:** Create new account with email/password
- **Sign In:** Login with existing credentials
- **Email Verification:** Confirm email addresses
- **Password Reset:** Reset forgotten passwords
- **Protected Routes:** Automatic redirect for unauthenticated users

### Subscription Management
- **Multiple Plans:** Free, Pro, and Enterprise tiers
- **Stripe Checkout:** Secure payment processing
- **Customer Portal:** Self-service billing management
- **Usage Tracking:** Monitor subscription status
- **Plan Upgrades:** Seamless plan changes

### User Dashboard
- **Analytics:** View key metrics and statistics
- **Profile Management:** Update personal information
- **Billing History:** Access payment history
- **Plan Details:** View current subscription details

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **JWT Authentication** via Supabase
- **Secure API Keys** stored as environment variables
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Supabase client

## 🚀 Deployment

### Environment Variables for Production

Make sure to update your environment variables for production:

\`\`\`env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
VITE_APP_URL=https://yourdomain.com
\`\`\`

### Build for Production

\`\`\`bash
npm run build
\`\`\`

The built files will be in the \`dist/\` directory, ready for deployment to platforms like Vercel, Netlify, or any static hosting service.

## 🔧 Customization

### Adding New Features

1. **New Pages:** Add to \`src/pages/\` and update routes in \`App.tsx\`
2. **New Components:** Add to \`src/components/\`
3. **Database Tables:** Create in Supabase and update policies
4. **API Endpoints:** Add serverless functions if needed

### Styling

- **Tailwind CSS** for utility classes
- **shadcn/ui** components for consistent design
- **Custom CSS** in \`src/index.css\`

### Theming

The template includes light/dark mode support via \`next-themes\`.

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Query Documentation](https://tanstack.com/query)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This template is provided as-is for educational and commercial use.

## 🆘 Support

For support, please check:
1. This README file
2. Supabase and Stripe documentation
3. GitHub Issues for known problems

---

**Happy building! 🚀**

This SaaS template provides a solid foundation for building subscription-based applications with modern technologies and best practices.`,
    fileType: 'md',
    type: 'md',
    size: 8000,
    isDirectory: false
  },
  {
    name: 'src/components/Footer.tsx',
    path: 'src/components/Footer.tsx',
    content: `import React from 'react'
import { Link } from 'react-router-dom'
import { Github, Twitter, Mail } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">SaaS Template</h3>
            <p className="text-gray-400 text-sm">
              The complete SaaS solution with authentication, payments, and everything you need.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link to="/pricing" className="text-gray-400 hover:text-white text-sm">Pricing</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Documentation</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Careers</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Contact Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 SaaS Template. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer`,
    fileType: 'tsx',
    type: 'tsx',
    size: 800,
    isDirectory: false
  }
]

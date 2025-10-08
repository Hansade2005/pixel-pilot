"use client"

import { useState, useEffect } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Briefcase, 
  Rocket,
  Gift,
  Image as ImageIcon,
  Bell,
  ChevronDown,
  Zap,
  Database
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useSubscription } from "@/hooks/use-subscription"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Shield, Crown } from "lucide-react"

export function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Subscription status hook
  const { subscription, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    checkUser()
    
    // Add scroll event listener
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const checkUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      setIsUserDropdownOpen(false)
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setIsMobileProfileOpen(false)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-2xl shadow-black/20' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side - Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/" onClick={closeMobileMenu}>
              <Logo variant="text" size="md" />
            </Link>
          </div>

          {/* Center - Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Products Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-white hover:text-gray-300 transition-colors flex items-center gap-1">
                  Products
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-gray-800 border-gray-700">
                <Link href="/">
                  <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                    <Zap className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium">AI App Builder</div>
                      <div className="text-xs text-gray-400">Build apps with chat</div>
                    </div>
                  </DropdownMenuItem>
                </Link>
                <Link href="/products/database">
                  <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                    <Database className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium">Database</div>
                      <div className="text-xs text-gray-400">PostgreSQL as a service</div>
                    </div>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link href="/community" className="text-white hover:text-gray-300 transition-colors">
              Community
            </Link>
            <Link href="/playground" className="text-white hover:text-gray-300 transition-colors">
              Playground
            </Link>
            <Link href="/schema" className="text-white hover:text-gray-300 transition-colors">
              Schema
            </Link>
            <Link href="/pricing" className="text-white hover:text-gray-300 transition-colors">
              Plans
            </Link>
            <Link href="/docs" className="text-white hover:text-gray-300 transition-colors">
              Docs
            </Link>
          </div>

          {/* Right Side - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Icons - Only show when logged in */}
            {!isLoading && user && (
              <>
                {/* Subscription Status */}
                {!subscriptionLoading && subscription && (
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      {subscription.plan === 'pro' ? 'Pro' :
                       subscription.plan === 'enterprise' ? 'Enterprise' :
                       'Free'}
                    </span>
                    {subscription.plan === 'free' && (subscription.githubPushesThisMonth || 0) >= 2 && (
                      <span className="text-xs text-orange-400 font-medium">
                        Limit
                      </span>
                    )}
                  </div>
                )}

                <button className="text-white hover:text-gray-300 transition-colors">
                  <Gift className="w-5 h-5" />
                </button>
                <button className="text-white hover:text-gray-300 transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-white hover:text-gray-300 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
              </>
            )}

            {/* User Profile or Auth Buttons */}
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center space-x-3 text-white hover:text-gray-300 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <span className="text-white text-sm hidden lg:block">
                          {user.email?.split('@')[0] || 'User'}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                                         <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700">
                       <Link href="/workspace/account">
                         <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                           <User className="w-4 h-4 mr-2" />
                           Account
                         </DropdownMenuItem>
                       </Link>
                       <Link href="/workspace">
                         <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                           <Briefcase className="w-4 h-4 mr-2" />
                           Dashboard
                         </DropdownMenuItem>
                       </Link>
                       {user && checkAdminAccess(user) && (
                         <>
                           <DropdownMenuSeparator className="bg-gray-700" />
                           <Link href="/admin">
                             <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                               <Shield className="w-4 h-4 mr-2" />
                               Admin Panel
                             </DropdownMenuItem>
                           </Link>
                         </>
                       )}
                       <Link href="/workspace/management">
                         <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                           <Settings className="w-4 h-4 mr-2" />
                           Projects
                         </DropdownMenuItem>
                       </Link>
                       <Link href="/database">
                         <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                           <Database className="w-4 h-4 mr-2" />
                           Database
                         </DropdownMenuItem>
                       </Link>
                       <Link href="/workspace/deployment">
                         <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                           <Rocket className="w-4 h-4 mr-2" />
                           Deploy
                         </DropdownMenuItem>
                       </Link>
                       <DropdownMenuSeparator className="bg-gray-700" />
                       <DropdownMenuItem 
                         className="text-white hover:bg-gray-700"
                         onClick={handleLogout}
                       >
                         <LogOut className="w-4 h-4 mr-2" />
                         Logout
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link href="/auth/login">
                      <Button variant="ghost" className="text-white hover:text-gray-300">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        Get started
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800/50 backdrop-blur-sm rounded-lg mt-2 border border-gray-700/50 max-h-[calc(100vh-80px)] overflow-y-auto">
              {/* Mobile Navigation Links */}
              <div className="border-b border-gray-700 pb-2 mb-2">
                <div className="px-3 py-2 text-gray-400 text-xs uppercase tracking-wider">
                  Products
                </div>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 text-white hover:text-gray-300 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Zap className="w-4 h-4" />
                  <div>
                    <div className="font-medium">AI App Builder</div>
                    <div className="text-xs text-gray-400">Build apps with chat</div>
                  </div>
                </Link>
                <Link
                  href="/products/database"
                  className="flex items-center gap-3 px-3 py-2 text-white hover:text-gray-300 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Database className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Database</div>
                    <div className="text-xs text-gray-400">PostgreSQL as a service</div>
                  </div>
                </Link>
              </div>
              
              <Link
                href="/community"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Community
              </Link>
              <Link
                href="/pricing"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Plans
              </Link>
              <Link
                href="/enterprise"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Business
              </Link>
              <Link
                href="/blog"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Blog
              </Link>
              <Link
                href="/docs"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Docs
              </Link>
              <Link
                href="/showcase"
                className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                onClick={closeMobileMenu}
              >
                Showcase
              </Link>

              {/* Mobile Auth Section */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                {/* Mobile Subscription Status */}
                {!isLoading && user && !subscriptionLoading && subscription && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">
                          {subscription.plan === 'pro' ? 'Pro Plan' :
                           subscription.plan === 'enterprise' ? 'Enterprise Plan' :
                           'Free Plan'}
                        </span>
                      </div>
                      {subscription.plan === 'free' && (subscription.githubPushesThisMonth || 0) >= 2 && (
                        <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
                          Limit Reached
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {subscription.plan === 'pro'
                        ? `${subscription.deploymentsThisMonth || 0}/10 deployments • Pro plan`
                        : subscription.plan === 'enterprise'
                        ? 'Unlimited usage • Enterprise plan'
                        : `${subscription.deploymentsThisMonth || 0}/5 deployments • ${subscription.githubPushesThisMonth || 0}/2 GitHub pushes • Free plan`
                      }
                    </div>
                  </div>
                )}

                {!isLoading && (
                  <>
                    {user ? (
                      <div className="space-y-2">
                        {/* Profile Dropdown Trigger */}
                        <button
                          onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
                          className="flex items-center justify-between w-full px-3 py-2 text-white hover:text-gray-300 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <span className="text-white text-sm">
                              {user.email?.split('@')[0] || 'User'}
                            </span>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isMobileProfileOpen ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                        
                                                 {/* Profile Dropdown Content */}
                         {isMobileProfileOpen && (
                           <div className="ml-4 space-y-1 border-l border-gray-700 pl-4">
                             <Link
                               href="/workspace/account"
                               className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                               onClick={closeMobileMenu}
                             >
                               <User className="w-4 h-4 inline mr-2" />
                               Account
                             </Link>
                             <Link
                               href="/workspace"
                               className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                               onClick={closeMobileMenu}
                             >
                               <Briefcase className="w-4 h-4 inline mr-2" />
                               Dashboard
                             </Link>
                             {user && checkAdminAccess(user) && (
                               <>
                                 <div className="border-t border-gray-700 my-2"></div>
                                 <Link
                                   href="/admin"
                                   className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                                   onClick={closeMobileMenu}
                                 >
                                   <Shield className="w-4 h-4 inline mr-2" />
                                   Admin Panel
                                 </Link>
                               </>
                             )}
                             <Link
                               href="/workspace/management"
                               className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                               onClick={closeMobileMenu}
                             >
                               <Settings className="w-4 h-4 inline mr-2" />
                               Projects
                             </Link>
                             <Link
                               href="/database"
                               className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                               onClick={closeMobileMenu}
                             >
                               <Database className="w-4 h-4 inline mr-2" />
                               Database
                             </Link>
                             <Link
                               href="/workspace/deployment"
                               className="block px-3 py-2 text-white hover:text-gray-300 transition-colors"
                               onClick={closeMobileMenu}
                             >
                               <Rocket className="w-4 h-4 inline mr-2" />
                               Deploy
                             </Link>
                             <button
                               onClick={() => {
                                 handleLogout()
                                 closeMobileMenu()
                               }}
                               className="block w-full text-left px-3 py-2 text-white hover:text-gray-300 transition-colors"
                             >
                               <LogOut className="w-4 h-4 inline mr-2" />
                               Logout
                             </button>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Link href="/auth/login" onClick={closeMobileMenu}>
                          <Button 
                            variant="ghost" 
                            className="w-full text-white hover:text-gray-300 justify-start"
                          >
                            Log in
                          </Button>
                        </Link>
                        <Link href="/auth/signup" onClick={closeMobileMenu}>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            Get started
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

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
import { useSubscriptionCache } from "@/hooks/use-subscription-cache"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Shield, Crown } from "lucide-react"

export function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Subscription status hook
  const { subscription, loading: subscriptionLoading } = useSubscriptionCache(user?.id)

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
            <Link href="/">
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
                      <div className="font-medium">PiPilot</div>
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
            <Link href="/blog" className="text-white hover:text-gray-300 transition-colors">
              Blog
            </Link>
            <Link href="/enterprise" className="text-white hover:text-gray-300 transition-colors">
              Business
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
                           Workspace
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

          {/* Mobile Navigation - Always visible */}
          <div className="md:hidden flex items-center justify-between w-full">
            {/* Left - Logo */}
            <div className="flex items-center">
              <Link href="/">
                <Logo variant="text" size="md" />
              </Link>
            </div>

            {/* Right - Auth Section */}
            {!isLoading && (
              <>
                {user ? (
                  /* Mobile Logged-in Layout */
                  <div className="flex items-center space-x-2">
                    {/* Bell Icon */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-white hover:text-gray-300 transition-colors p-2">
                          <Bell className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
                        <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                          Notifications
                        </div>
                        <div className="py-2">
                          <div className="px-3 py-4 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No new notifications</div>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Profile Icon Trigger */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-white hover:text-gray-300 transition-colors p-2">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
                        {/* Subscription Status in Dropdown */}
                        {!subscriptionLoading && subscription && (
                          <div className="px-3 py-3 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-2">
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
                                  Limit
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {subscription.plan === 'pro'
                                ? `${subscription.deploymentsThisMonth || 0}/10 deployments`
                                : subscription.plan === 'enterprise'
                                ? 'Unlimited usage'
                                : `${subscription.deploymentsThisMonth || 0}/5 deployments • ${subscription.githubPushesThisMonth || 0}/2 pushes`
                              }
                            </div>
                          </div>
                        )}

                        <Link href="/workspace/account">
                          <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                            <User className="w-4 h-4 mr-2" />
                            Account
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/workspace">
                          <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Workspace
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
                  </div>
                ) : (
                  /* Mobile Non-logged-in Layout */
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
      </div></div>
    </nav>
  )
}

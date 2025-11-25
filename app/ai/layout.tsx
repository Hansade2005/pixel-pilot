"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
    Users,
    Wallet,
    Key,
    Settings,
    Plus,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Menu,
    Sun,
    Moon,
    Activity,
    CreditCard,
    Sparkles
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AIPlatformLayoutProps {
    children: React.ReactNode
}

interface TeamInfo {
    id: string
    name: string
    description: string | null
    is_default: boolean
    created_at: string
}

const navigationItems = [
    {
        id: 'platform',
        label: 'Platform',
        icon: Users,
        href: '/ai/platform',
        tab: null,
        description: 'Team management and overview'
    },
    {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        href: '/ai/platform?tab=keys',
        tab: 'keys',
        description: 'Manage API keys'
    },
    {
        id: 'wallet',
        label: 'Wallet',
        icon: Wallet,
        href: '/ai/platform?tab=wallet',
        tab: 'wallet',
        description: 'Credits and billing'
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: Activity,
        href: '/ai/platform?tab=activity',
        tab: 'activity',
        description: 'Usage analytics'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        href: '/ai/platform?tab=settings',
        tab: 'settings',
        description: 'Platform settings'
    }
]

export default function AIPlatformLayout({ children }: AIPlatformLayoutProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [teams, setTeams] = useState<TeamInfo[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        loadUserTeams()
    }, [pathname])

    async function loadUserTeams() {
        try {
            setLoading(true)
            const response = await fetch('/api/ai/teams')

            if (!response.ok) {
                throw new Error('Failed to fetch teams')
            }

            const data = await response.json()

            if (data.teams && data.teams.length > 0) {
                setTeams(data.teams)

                // Get stored team ID or use default team
                const storedTeamId = localStorage.getItem('user_team_id')
                const defaultTeam = data.teams.find((team: TeamInfo) => team.is_default)
                const selectedId = storedTeamId && data.teams.find((team: TeamInfo) => team.id === storedTeamId)
                    ? storedTeamId
                    : defaultTeam?.id || data.teams[0].id

                setSelectedTeamId(selectedId)
                localStorage.setItem('user_team_id', selectedId)
            } else {
                // No teams found
                setTeams([])
                setSelectedTeamId('')
                localStorage.removeItem('user_team_id')
            }
        } catch (error) {
            console.error('Error loading teams:', error)
            toast.error('Failed to load teams')
        } finally {
            setLoading(false)
        }
    }

    const handleTeamChange = (teamId: string) => {
        setSelectedTeamId(teamId)
        localStorage.setItem('user_team_id', teamId)
        toast.success('Team switched successfully')
        window.location.reload()
    }

    const selectedTeam = teams.find(team => team.id === selectedTeamId)

    if (!mounted) {
        return null
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5"></div>
                </div>

            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
                        {!isCollapsed && (
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-semibold text-white">
                                  PiPIlot  AI
                                </span>
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="text-white hover:bg-white/10"
                            >
                                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="text-white hover:bg-white/10 hidden lg:flex"
                            >
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="lg:hidden text-white hover:bg-white/10"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Team Selector */}
                    {!isCollapsed && teams.length > 0 && (
                        <div className="p-4 border-b border-white/10">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Active Team
                                </label>
                                <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                                    <SelectTrigger className="bg-gray-800/50 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-white/10">
                                        {teams.map(team => (
                                            <SelectItem key={team.id} value={team.id} className="text-white hover:bg-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    {team.name}
                                                    {team.is_default && (
                                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.tab 
                                ? pathname === '/ai/platform' && searchParams.get('tab') === item.tab
                                : pathname === item.href

                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                                                isActive
                                                    ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/10"
                                                    : "text-gray-300 hover:bg-white/5 hover:text-white",
                                                isCollapsed && "justify-center px-2"
                                            )}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-purple-400")} />
                                            {!isCollapsed && (
                                                <>
                                                    <span>{item.label}</span>
                                                    {isActive && (
                                                        <div className="ml-auto w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    {isCollapsed && (
                                        <TooltipContent side="right" className="bg-gray-900 border-white/10 text-white">
                                            <div>
                                                <div className="font-medium">{item.label}</div>
                                                <div className="text-xs text-gray-400">{item.description}</div>
                                            </div>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10">
                        <Link href="/workspace">
                            <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                {!isCollapsed && "Back to Workspace"}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className={cn(
                "relative z-10 transition-all duration-300 ease-in-out",
                isCollapsed ? "lg:pl-16" : "lg:pl-64"
            )}>
                {/* Mobile header */}
                <div className="sticky top-0 z-30 lg:hidden bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
                    <div className="flex items-center justify-between h-16 px-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="text-white hover:bg-white/10"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center space-x-4">
                            {selectedTeam && (
                                <div className="text-white text-sm font-medium">
                                    {selectedTeam.name}
                                </div>
                            )}
                            <Link href="/workspace">
                                <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="relative">
                    {children}
                </main>
            </div>
            </div>
        </TooltipProvider>
    )
}
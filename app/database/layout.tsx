"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
    Database,
    Table,
    HardDrive,
    Users,
    Settings,
    Plus,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Menu,
    Sun,
    Moon,
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

interface DatabaseLayoutProps {
    children: React.ReactNode
}

interface DatabaseInfo {
    id: number
    name: string
    project_id: string
    created_at: string
}

export default function DatabaseLayout({ children }: DatabaseLayoutProps) {
    const pathname = usePathname()
    const [databases, setDatabases] = useState<DatabaseInfo[]>([])
    const [selectedDbId, setSelectedDbId] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        loadUserDatabases()
    }, [pathname])

    async function loadUserDatabases() {
        try {
            setLoading(true)
            const storedDbId = localStorage.getItem('user_database_id')

            // Fetch all databases for the user
            const response = await fetch('/api/database/list')

            if (!response.ok) {
                throw new Error('Failed to fetch databases')
            }

            const data = await response.json()

            if (data.databases && data.databases.length > 0) {
                setDatabases(data.databases)

                // If we have a stored DB ID and it exists in the list, use it
                // Otherwise, use the first database
                const dbExists = data.databases.find((db: DatabaseInfo) => db.id.toString() === storedDbId)
                const selectedId = dbExists ? storedDbId : data.databases[0].id.toString()

                setSelectedDbId(selectedId!)
                localStorage.setItem('user_database_id', selectedId!)
            } else {
                // No databases found
                setDatabases([])
                setSelectedDbId('')
                localStorage.removeItem('user_database_id')
            }
        } catch (error) {
            console.error('Error loading databases:', error)
            toast.error('Failed to load databases')
        } finally {
            setLoading(false)
        }
    }

    const handleDatabaseSwitch = (dbId: string) => {
        setSelectedDbId(dbId)
        localStorage.setItem('user_database_id', dbId)
        toast.success('Database switched')
        window.location.reload()
    }

    const navItems = [
        { href: "/database", icon: BarChart3, label: "Overview", exact: true },
        { href: "/database/tables", icon: Table, label: "Tables", exact: false },
        { href: "/database/storage", icon: HardDrive, label: "Storage", exact: false },
        { href: "/database/auth", icon: Users, label: "Auth", exact: false },
        { href: "/database/settings", icon: Settings, label: "Settings", exact: false },
    ]

    return (
        <div className="min-h-screen bg-background">
            <div className="fixed inset-0 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5 dark:from-purple-900/20 dark:via-gray-900 dark:to-blue-900/20" />
            <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-[0.015] dark:opacity-[0.015]" />

            <TooltipProvider delayDuration={0}>
                {/* Mobile Header with Hamburger */}
                <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        <span className="font-bold text-foreground">Database</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-foreground"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>

                {/* Mobile Backdrop Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                <div className="relative flex h-screen md:pt-0 pt-14">
                    <aside
                        className={cn(
                            "h-full bg-card backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 ease-in-out shadow-sm",
                            // Mobile: fixed positioning with slide animation
                            "fixed md:relative z-50 md:z-auto",
                            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                            // Width
                            isCollapsed ? "w-64 md:w-16" : "w-64"
                        )}
                        onClick={(e) => {
                            // Close mobile menu when clicking a link
                            if ((e.target as HTMLElement).tagName === 'A') {
                                setIsMobileMenuOpen(false)
                            }
                        }}
                    >
                        {/* Header with Database selector - Hidden on mobile */}
                        <div className={cn(
                            "p-4 border-b border-border transition-all duration-300 md:block hidden",
                            isCollapsed && "p-2"
                        )}>
                            <div className={cn(
                                "flex items-center gap-2 mb-4",
                                isCollapsed && "justify-center mb-2"
                            )}>
                                <Database className="h-5 w-5 text-primary flex-shrink-0" />
                                {!isCollapsed && <span className="font-bold text-foreground">Database</span>}
                            </div>

                            {databases.length > 0 && !isCollapsed && (
                                <Select value={selectedDbId} onValueChange={handleDatabaseSwitch}>
                                    <SelectTrigger className="w-full bg-background border-input text-foreground hover:bg-accent hover:text-accent-foreground">
                                        <SelectValue placeholder="Select database" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border">
                                        {databases.map((db) => (
                                            <SelectItem
                                                key={db.id}
                                                value={db.id.toString()}
                                                className="text-white hover:bg-gray-700"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Database className="h-4 w-4 text-purple-400" />
                                                    <span>{db.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Navigation Items */}
                        <nav className={cn(
                            "flex-1 p-3 space-y-1",
                            isCollapsed && "p-2"
                        )}>
                            {navItems.map((item, index) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href)
                                const Icon = item.icon

                                const navLink = (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-primary/15 text-primary font-semibold dark:bg-primary/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                                            isCollapsed && "justify-center px-2"
                                        )}
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                        }}
                                    >
                                        {isActive && !isCollapsed && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-sm" />
                                        )}

                                        <Icon className={cn(
                                            "h-5 w-5 flex-shrink-0",
                                            isActive && "text-primary"
                                        )} />
                                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                    </Link>
                                )

                                // Wrap in tooltip when collapsed
                                if (isCollapsed) {
                                    return (
                                        <Tooltip key={item.href}>
                                            <TooltipTrigger asChild>
                                                {navLink}
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                                                {item.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                }

                                return navLink
                            })}
                        </nav>

                        {/* Theme Switcher */}
                        <div className={cn(
                            "px-4 py-2 border-t border-border",
                            isCollapsed && "px-2"
                        )}>
                            {isCollapsed ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                            className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
                                        >
                                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                                        Toggle Theme
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                                >
                                    {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                                    <span className="text-xs">Toggle Theme</span>
                                </Button>
                            )}
                        </div>

                        {/* Toggle Button - Hidden on mobile */}
                        <div className={cn(
                            "px-4 py-2 border-t border-border md:block hidden",
                            isCollapsed && "px-2"
                        )}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className={cn(
                                    "w-full text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border",
                                    isCollapsed && "px-2"
                                )}
                                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <>
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        <span className="text-xs">Collapse</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* New Database Button */}
                        <div className={cn(
                            "p-4 border-t border-white/5",
                            isCollapsed && "p-2"
                        )}>
                            {databases.length >= 2 ? (
                                isCollapsed ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                disabled
                                                size="icon"
                                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground shadow-md"
                                                title="Maximum 2 databases per user"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                                            New Database ({databases.length}/2)
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Button
                                        disabled
                                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground shadow-md"
                                        title="Maximum 2 databases per user"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Database
                                        <span className="ml-auto text-xs opacity-70">
                                            ({databases.length}/2)
                                        </span>
                                    </Button>
                                )
                            ) : (
                                <Link href="/database/new">
                                    {isCollapsed ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 hover:scale-105"
                                                    title="Create new database"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                                                New Database {databases.length > 0 && `(${databases.length}/2)`}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:scale-105"
                                            title="Create new database"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Database
                                            {databases.length > 0 && (
                                                <span className="ml-auto text-xs opacity-70">
                                                    ({databases.length}/2)
                                                </span>
                                            )}
                                        </Button>
                                    )}
                                </Link>
                            )}
                        </div>
                    </aside>

                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </TooltipProvider>
        </div>
    )
}

"use client"

// Quality Analysis Tab - Direct file access from storage manager
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, RefreshCw, FileText, FolderOpen, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface QualityTabProps {
    user: User
    selectedProject: Workspace | null
    isSidebar?: boolean
    onToggleExplorer?: () => void
    showExplorer?: boolean
    selectedQualityPath?: string
    onSelectQuality?: (path: string) => void
}

interface QualityFile {
    path: string
    name: string
    type: 'complexity' | 'coverage' | 'standards' | 'metrics' | 'general'
    lastModified?: string
}

export function QualityTab({ user, selectedProject, isSidebar = false, onToggleExplorer, showExplorer, selectedQualityPath = "", onSelectQuality }: QualityTabProps) {
    // Initialize state variables
    const { toast } = useToast()
    const [selectedQuality, setSelectedQuality] = useState<string>(selectedQualityPath)
    const [qualityContent, setQualityContent] = useState<string>("")
    const [availableQuality, setAvailableQuality] = useState<QualityFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Sync with parent selected path
    useEffect(() => {
        if (selectedQualityPath) {
            setSelectedQuality(selectedQualityPath)
            loadQualityContent(selectedQualityPath)
        }
    }, [selectedQualityPath])

    useEffect(() => {
        if (selectedProject) {
            loadAvailableQuality()
        }
    }, [selectedProject])

    const loadAvailableQuality = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Import and initialize storage manager
            const { storageManager } = await import('@/lib/storage-manager')
            await storageManager.init()

            // Get all files from storage
            const allFiles = await storageManager.getFiles(selectedProject.id)
            const qualityFiles: QualityFile[] = []

            if (allFiles && allFiles.length > 0) {
                // Filter quality markdown files
                const qualityFilesList = allFiles.filter(f => 
                    !f.isDirectory && (f.path.includes('/quality/') || f.path.includes('quality') || f.path.includes('analysis'))
                )

                for (const file of qualityFilesList) {
                    const qualityType = file.path.includes('complexity') ? 'complexity' :
                                      file.path.includes('coverage') ? 'coverage' :
                                      file.path.includes('standards') ? 'standards' :
                                      file.path.includes('metrics') ? 'metrics' : 'general'
                    qualityFiles.push({
                        path: file.path,
                        name: file.name.replace('.md', ''),
                        type: qualityType,
                        lastModified: file.updatedAt
                    })
                }
            }

            // Fallback to default quality files if none found
            if (qualityFiles.length === 0) {
                const defaultQualityFiles: QualityFile[] = [
                    { path: "docs/quality/complexity-analysis.md", name: "Complexity Analysis", type: "complexity" },
                    { path: "docs/quality/test-coverage.md", name: "Test Coverage Report", type: "coverage" },
                    { path: "docs/quality/coding-standards.md", name: "Coding Standards", type: "standards" },
                    { path: "docs/quality/quality-metrics.md", name: "Quality Metrics", type: "metrics" },
                    { path: "docs/quality/general-quality.md", name: "General Quality Report", type: "general" }
                ]
                // Only add those that actually exist in storage
                for (const quality of defaultQualityFiles) {
                    const file = allFiles?.find(f => f.path === quality.path)
                    if (file) {
                        qualityFiles.push(quality)
                    }
                }
            }

            setAvailableQuality(qualityFiles)

            // Auto-select the first quality report if available
            if (qualityFiles.length > 0 && !selectedQuality) {
                setSelectedQuality(qualityFiles[0].path)
                loadQualityContent(qualityFiles[0].path)
            }
        } catch (error) {
            console.error('Error loading quality reports:', error)
            toast({
                title: "Error",
                description: "Failed to load quality analysis files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadQualityContent = async (filePath: string) => {
        // Load quality report content from storage
        if (!selectedProject || !filePath) return

        setIsLoading(true)
        try {
            // Import and initialize storage manager
            const { storageManager } = await import('@/lib/storage-manager')
            await storageManager.init()

            // Get the file directly from storage
            const file = await storageManager.getFile(selectedProject.id, filePath)

            if (!file) {
                throw new Error('File not found')
            }

            setQualityContent(file.content || "# Quality Report Not Found\n\nThe requested quality analysis file could not be loaded.")
        } catch (error) {
            console.error('Error loading quality content:', error)
            setQualityContent("# Error Loading Quality Report\n\nFailed to load the quality analysis content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load quality report content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleQualitySelect = (filePath: string) => {
        setSelectedQuality(filePath)
        if (onSelectQuality) {
            onSelectQuality(filePath)
        }
        loadQualityContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'complexity': return <TrendingUp className="h-4 w-4" />
            case 'coverage': return <CheckCircle className="h-4 w-4" />
            case 'standards': return <AlertCircle className="h-4 w-4" />
            case 'metrics': return <BarChart3 className="h-4 w-4" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'complexity': return 'bg-purple-100 text-purple-800'
            case 'coverage': return 'bg-green-100 text-green-800'
            case 'standards': return 'bg-blue-100 text-blue-800'
            case 'metrics': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Sidebar mode - show file list only
    if (isSidebar) {
        return (
            <div className="space-y-3 h-full flex flex-col pt-4">
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {availableQuality.map((qualityFile) => (
                        <button
                            key={qualityFile.path}
                            onClick={() => handleQualitySelect(qualityFile.path)}
                            className={cn(
                                "w-full text-left p-3 rounded-lg hover:bg-accent/80 transition-all duration-200 border border-transparent hover:border-border group",
                                selectedQuality === qualityFile.path && "bg-accent border-border shadow-sm"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                                    {getTypeIcon(qualityFile.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate text-foreground group-hover:text-foreground/90">{qualityFile.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5 group-hover:text-muted-foreground/80">{qualityFile.path}</p>
                                </div>
                                <Badge variant="secondary" className={cn("text-xs flex-shrink-0", getTypeColor(qualityFile.type))}>
                                    {qualityFile.type}
                                </Badge>
                            </div>
                        </button>
                    ))}

                    {availableQuality.length === 0 && !isLoading && (
                        <div className="text-center py-8 px-4">
                            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">No quality reports found</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Quality analyses will be generated automatically</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t">
                    <Button
                        onClick={loadAvailableQuality}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>
        )
    }

    // Main content mode - show quality viewer only
    return (
        <div className="h-full flex flex-col">
            {/* Quality Viewer */}
            <div className="flex-1 p-6">
                {qualityContent ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Response>{qualityContent}</Response>
                    </div>
                ) : selectedQuality ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading quality report...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Select a Quality Report</h3>
                            <p className="text-muted-foreground">
                                Choose a quality analysis file from the sidebar to view its contents
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {!selectedProject && (
                <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                        <p className="text-muted-foreground">
                            Select a project to view quality reports
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
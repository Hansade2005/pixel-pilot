"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, FileText, FolderOpen, Shield, Bug, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface ReviewTabProps {
    user: User
    selectedProject: Workspace | null
    isSidebar?: boolean
    onToggleExplorer?: () => void
    showExplorer?: boolean
}

interface ReviewFile {
    path: string
    name: string
    type: 'security' | 'performance' | 'maintainability' | 'general'
    lastModified?: string
}

export function ReviewTab({ user, selectedProject, isSidebar = false, onToggleExplorer, showExplorer }: ReviewTabProps) {
    const { toast } = useToast()
    const [selectedReview, setSelectedReview] = useState<string>("")
    const [reviewContent, setReviewContent] = useState<string>("")
    const [availableReviews, setAvailableReviews] = useState<ReviewFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (selectedProject) {
            loadAvailableReviews()
        }
    }, [selectedProject])

    const loadAvailableReviews = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Import and initialize storage manager
            const { storageManager } = await import('@/lib/storage-manager')
            await storageManager.init()

            // Get all files from storage
            const allFiles = await storageManager.getFiles(selectedProject.id)
            const reviews: ReviewFile[] = []

            if (allFiles && allFiles.length > 0) {
                // Filter review markdown files
                const reviewFiles = allFiles.filter(f => 
                    !f.isDirectory && (f.path.includes('/reviews/') || f.path.includes('review'))
                )

                for (const file of reviewFiles) {
                    const reviewType = file.path.includes('security') ? 'security' :
                                     file.path.includes('performance') ? 'performance' :
                                     file.path.includes('maintainability') ? 'maintainability' : 'general'
                    reviews.push({
                        path: file.path,
                        name: file.name.replace('.md', ''),
                        type: reviewType,
                        lastModified: file.updatedAt
                    })
                }
            }

            // Fallback to default reviews if none found
            if (reviews.length === 0) {
                const defaultReviews: ReviewFile[] = [
                    { path: "docs/reviews/security-review.md", name: "Security Review", type: "security" },
                    { path: "docs/reviews/performance-review.md", name: "Performance Review", type: "performance" },
                    { path: "docs/reviews/maintainability-review.md", name: "Maintainability Review", type: "maintainability" },
                    { path: "docs/reviews/general-review.md", name: "General Code Review", type: "general" }
                ]
                // Only add those that actually exist in storage
                for (const review of defaultReviews) {
                    const file = allFiles?.find(f => f.path === review.path)
                    if (file) {
                        reviews.push(review)
                    }
                }
            }

            setAvailableReviews(reviews)

            // Auto-select the first review if available
            if (reviews.length > 0 && !selectedReview) {
                setSelectedReview(reviews[0].path)
                loadReviewContent(reviews[0].path)
            }
        } catch (error) {
            console.error('Error loading reviews:', error)
            toast({
                title: "Error",
                description: "Failed to load code review files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadReviewContent = async (filePath: string) => {
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

            setReviewContent(file.content || "# Review Not Found\n\nThe requested code review file could not be loaded.")
        } catch (error) {
            console.error('Error loading review content:', error)
            setReviewContent("# Error Loading Review\n\nFailed to load the code review content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load review content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleReviewSelect = (filePath: string) => {
        setSelectedReview(filePath)
        loadReviewContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'security': return <Shield className="h-4 w-4" />
            case 'performance': return <Zap className="h-4 w-4" />
            case 'maintainability': return <Bug className="h-4 w-4" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'security': return 'bg-red-100 text-red-800'
            case 'performance': return 'bg-yellow-100 text-yellow-800'
            case 'maintainability': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Sidebar mode - show file list only
    if (isSidebar) {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    {availableReviews.map((review) => (
                        <button
                            key={review.path}
                            onClick={() => handleReviewSelect(review.path)}
                            className={cn(
                                "w-full text-left p-2 rounded-md hover:bg-accent transition-colors",
                                selectedReview === review.path && "bg-accent"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {getTypeIcon(review.type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{review.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{review.path}</p>
                                </div>
                                <Badge variant="secondary" className={cn("text-xs", getTypeColor(review.type))}>
                                    {review.type}
                                </Badge>
                            </div>
                        </button>
                    ))}

                    {availableReviews.length === 0 && !isLoading && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No reviews found</p>
                            <p className="text-xs text-muted-foreground">Code reviews will be generated automatically</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-4">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t">
                    <Button
                        onClick={loadAvailableReviews}
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

    // Main content mode - show review viewer only
    return (
        <div className="h-full flex flex-col">
            {/* Review Viewer */}
            <div className="flex-1 p-6">
                {reviewContent ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Response>{reviewContent}</Response>
                    </div>
                ) : selectedReview ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading review...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Select a Review</h3>
                            <p className="text-muted-foreground">
                                Choose a code review file from the sidebar to view its contents
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {!selectedProject && (
                <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                        <p className="text-muted-foreground">
                            Select a project to view code reviews
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, RefreshCw, BookOpen, File, FolderOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface DocsTabProps {
    user: User
    selectedProject: Workspace | null
    isSidebar?: boolean
    onToggleExplorer?: () => void
    showExplorer?: boolean
    selectedDocPath?: string
    onSelectDoc?: (path: string) => void
}

interface DocFile {
    path: string
    name: string
    type: 'readme' | 'api' | 'feature' | 'contributing' | 'changelog' | 'other'
    lastModified?: string
}

export function DocsTab({ user, selectedProject, isSidebar = false, onToggleExplorer, showExplorer, selectedDocPath = "", onSelectDoc }: DocsTabProps) {
    const { toast } = useToast()
    const [selectedDoc, setSelectedDoc] = useState<string>(selectedDocPath)
    const [docContent, setDocContent] = useState<string>("")
    const [availableDocs, setAvailableDocs] = useState<DocFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Sync with parent selected path
    useEffect(() => {
        if (selectedDocPath) {
            setSelectedDoc(selectedDocPath)
            loadDocContent(selectedDocPath)
        }
    }, [selectedDocPath])

    // Default documentation files to check
    const defaultDocs: DocFile[] = [
        { path: "README.md", name: "README", type: "readme" },
        { path: "docs/api.md", name: "API Documentation", type: "api" },
        { path: "docs/features.md", name: "Features", type: "feature" },
        { path: "docs/contributing.md", name: "Contributing Guide", type: "contributing" },
        { path: "CHANGELOG.md", name: "Changelog", type: "changelog" }
    ]

    useEffect(() => {
        if (selectedProject) {
            loadAvailableDocs()
        }
    }, [selectedProject])

    const loadAvailableDocs = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Import and initialize storage manager
            const { storageManager } = await import('@/lib/storage-manager')
            await storageManager.init()

            // Get all files from storage
            const allFiles = await storageManager.getFiles(selectedProject.id)
            const existingDocs: DocFile[] = []

            if (allFiles && allFiles.length > 0) {
                // Filter markdown files and documentation files
                const docFiles = allFiles.filter(f => 
                    !f.isDirectory && (f.name.endsWith('.md') || f.path.includes('/docs/'))
                )

                for (const file of docFiles) {
                    const docType = file.path.includes('README') ? 'readme' : 
                                  file.path.includes('SETUP') || file.path.includes('SETUP') ? 'feature' :
                                  file.path.includes('API') ? 'api' : 'other'
                    existingDocs.push({
                        path: file.path,
                        name: file.name.replace('.md', ''),
                        type: docType,
                        lastModified: file.updatedAt
                    })
                }
            }

            // Fallback to default docs if none found
            if (existingDocs.length === 0) {
                const defaultDocsList: DocFile[] = [
                    { path: "README.md", name: "README", type: "readme" },
                    { path: "docs/API.md", name: "API Documentation", type: "api" },
                    { path: "docs/ARCHITECTURE.md", name: "Architecture", type: "other" }
                ]
                // Only add those that actually exist in storage
                for (const doc of defaultDocsList) {
                    const file = allFiles?.find(f => f.path === doc.path)
                    if (file) {
                        existingDocs.push(doc)
                    }
                }
            }

            setAvailableDocs(existingDocs)

            // Auto-select README if it exists
            const readme = existingDocs.find(doc => doc.type === 'readme')
            if (readme && !selectedDoc) {
                setSelectedDoc(readme.path)
                loadDocContent(readme.path)
            }
        } catch (error) {
            console.error('Error loading docs:', error)
            toast({
                title: "Error",
                description: "Failed to load documentation files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadDocContent = async (filePath: string) => {
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

            setDocContent(file.content || "# Document Not Found\n\nThe requested documentation file could not be loaded.")
        } catch (error) {
            console.error('Error loading doc content:', error)
            setDocContent("# Error Loading Document\n\nFailed to load the documentation content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load document content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDocSelect = (filePath: string) => {
        setSelectedDoc(filePath)
        if (onSelectDoc) {
            onSelectDoc(filePath)
        }
        loadDocContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'readme': return <BookOpen className="h-4 w-4" />
            case 'api': return <FileText className="h-4 w-4" />
            case 'feature': return <File className="h-4 w-4" />
            case 'contributing': return <FileText className="h-4 w-4" />
            case 'changelog': return <FileText className="h-4 w-4" />
            default: return <FolderOpen className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'readme': return 'bg-blue-100 text-blue-800'
            case 'api': return 'bg-green-100 text-green-800'
            case 'feature': return 'bg-purple-100 text-purple-800'
            case 'contributing': return 'bg-orange-100 text-orange-800'
            case 'changelog': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Sidebar mode - show file list only
    if (isSidebar) {
        return (
            <div className="space-y-3 h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {availableDocs.map((doc) => (
                        <button
                            key={doc.path}
                            onClick={() => handleDocSelect(doc.path)}
                            className={cn(
                                "w-full text-left p-3 rounded-lg hover:bg-accent/80 transition-all duration-200 border border-transparent hover:border-border group",
                                selectedDoc === doc.path && "bg-accent border-border shadow-sm"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                                    {getTypeIcon(doc.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate text-foreground group-hover:text-foreground/90">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5 group-hover:text-muted-foreground/80">{doc.path}</p>
                                </div>
                                <Badge variant="secondary" className={cn("text-xs flex-shrink-0", getTypeColor(doc.type))}>
                                    {doc.type}
                                </Badge>
                            </div>
                        </button>
                    ))}

                    {availableDocs.length === 0 && !isLoading && (
                        <div className="text-center py-8 px-4">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">No documentation found</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Documentation will be generated automatically</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t space-y-2">
                    <Button
                        onClick={loadAvailableDocs}
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

    // Main content mode - show document viewer only
    return (
        <div className="h-full flex flex-col">
            {/* Document Viewer */}
            <div className="flex-1 p-6">
                {docContent ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Response>{docContent}</Response>
                    </div>
                ) : selectedDoc ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading document...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Select a Document</h3>
                            <p className="text-muted-foreground">
                                Choose a documentation file from the sidebar to view its contents
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {!selectedProject && (
                <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                        <p className="text-muted-foreground">
                            Select a project to view documentation
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
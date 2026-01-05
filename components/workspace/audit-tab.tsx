"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Search, CheckCircle, Shield, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { DocsTab } from "./audit-tabs/docs-tab"
import { ReviewTab } from "./audit-tabs/review-tab"
import { QualityTab } from "./audit-tabs/quality-tab"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface AuditTabProps {
    user: User
    selectedProject: Workspace | null
}

export function AuditTab({ user, selectedProject }: AuditTabProps) {
    const [activeAuditTab, setActiveAuditTab] = useState<"docs" | "review" | "quality">("docs")
    const [showFileExplorer, setShowFileExplorer] = useState(true)
    const [selectedDocPath, setSelectedDocPath] = useState<string>("")
    const [selectedReviewPath, setSelectedReviewPath] = useState<string>("")
    const [selectedQualityPath, setSelectedQualityPath] = useState<string>("")
    const isMobile = useIsMobile()

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Audit Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Audit Tools</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* File Explorer Sidebar - Toggleable overlay for both mobile and PC */}
                {showFileExplorer && (
                    <div className={cn(
                        "border-r border-border overflow-y-auto",
                        isMobile
                            ? "absolute inset-y-0 left-0 w-80 bg-background shadow-lg z-20 border-r"
                            : "w-80 flex-shrink-0"
                    )}>
                        <div className="p-4">
                            {/* Tab Switcher in Sidebar */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold">Audit Files</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowFileExplorer(false)}
                                    className="h-8 w-8"
                                    title="Hide file explorer"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>

                            <Tabs value={activeAuditTab} onValueChange={(value) => setActiveAuditTab(value as "docs" | "review" | "quality")}>
                                <TabsList className="grid w-full grid-cols-1 mb-4">
                                    <TabsTrigger value="docs" className="flex items-center gap-2 justify-start">
                                        <FileText className="h-4 w-4" />
                                        <span>Documentation</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="review" className="flex items-center gap-2 justify-start">
                                        <Search className="h-4 w-4" />
                                        <span>Code Review</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="quality" className="flex items-center gap-2 justify-start">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Quality</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="docs" className="m-0">
                                    <DocsTab
                                        user={user}
                                        selectedProject={selectedProject}
                                        isSidebar={true}
                                        onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                        showExplorer={showFileExplorer}
                                        selectedDocPath={selectedDocPath}
                                        onSelectDoc={setSelectedDocPath}
                                    />
                                </TabsContent>
                                <TabsContent value="review" className="m-0">
                                    <ReviewTab
                                        user={user}
                                        selectedProject={selectedProject}
                                        isSidebar={true}
                                        onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                        showExplorer={showFileExplorer}
                                        selectedReviewPath={selectedReviewPath}
                                        onSelectReview={setSelectedReviewPath}
                                    />
                                </TabsContent>
                                <TabsContent value="quality" className="m-0">
                                    <QualityTab
                                        user={user}
                                        selectedProject={selectedProject}
                                        isSidebar={true}
                                        onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                        showExplorer={showFileExplorer}
                                        selectedQualityPath={selectedQualityPath}
                                        onSelectQuality={setSelectedQualityPath}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                )}

                {/* Mobile Overlay - Click to close */}
                {isMobile && showFileExplorer && (
                    <div
                        className="absolute inset-0 bg-black/50 z-10"
                        onClick={() => setShowFileExplorer(false)}
                    />
                )}

                {/* Main Content Area */}
                <div className={cn(
                    "flex-1 overflow-y-auto",
                    isMobile ? "pt-4" : ""
                )}>
                    {/* File Explorer Toggle Button - Only show when explorer is closed */}
                    {!showFileExplorer && (
                        <div className="absolute top-4 left-4 z-10">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowFileExplorer(true)}
                                className="h-8 w-8 shadow-md"
                                title="Show file explorer"
                            >
                                <Menu className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <Tabs value={activeAuditTab} className="h-full">
                        <TabsContent value="docs" className="h-full m-0">
                            <DocsTab
                                user={user}
                                selectedProject={selectedProject}
                                isSidebar={false}
                                onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                showExplorer={showFileExplorer}
                                selectedDocPath={selectedDocPath}
                                onSelectDoc={setSelectedDocPath}
                            />
                        </TabsContent>
                        <TabsContent value="review" className="h-full m-0">
                            <ReviewTab
                                user={user}
                                selectedProject={selectedProject}
                                isSidebar={false}
                                onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                showExplorer={showFileExplorer}
                                selectedReviewPath={selectedReviewPath}
                                onSelectReview={setSelectedReviewPath}
                            />
                        </TabsContent>
                        <TabsContent value="quality" className="h-full m-0">
                            <QualityTab
                                user={user}
                                selectedProject={selectedProject}
                                isSidebar={false}
                                onToggleExplorer={() => setShowFileExplorer(!showFileExplorer)}
                                showExplorer={showFileExplorer}
                                selectedQualityPath={selectedQualityPath}
                                onSelectQuality={setSelectedQualityPath}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
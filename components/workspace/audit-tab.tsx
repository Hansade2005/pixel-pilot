"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Search, CheckCircle, Shield } from "lucide-react"
import { DocsTab } from "./audit-tabs/docs-tab"
import { ReviewTab } from "./audit-tabs/review-tab"
import { QualityTab } from "./audit-tabs/quality-tab"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface AuditTabProps {
    user: User
    selectedProject: Workspace | null
}

export function AuditTab({ user, selectedProject }: AuditTabProps) {
    const [activeAuditTab, setActiveAuditTab] = useState<"docs" | "review" | "quality">("docs")

    return (
        <div className="h-full flex flex-col">
            {/* Internal Tab Switcher */}
            <div className="border-b border-border bg-card p-2 flex-shrink-0">
                <Tabs value={activeAuditTab} onValueChange={(value) => setActiveAuditTab(value as "docs" | "review" | "quality")}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="docs" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Docs</span>
                        </TabsTrigger>
                        <TabsTrigger value="review" className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            <span className="hidden sm:inline">Review</span>
                        </TabsTrigger>
                        <TabsTrigger value="quality" className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Quality</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                <Tabs value={activeAuditTab} className="h-full">
                    <TabsContent value="docs" className="h-full m-0">
                        <DocsTab user={user} selectedProject={selectedProject} />
                    </TabsContent>
                    <TabsContent value="review" className="h-full m-0">
                        <ReviewTab user={user} selectedProject={selectedProject} />
                    </TabsContent>
                    <TabsContent value="quality" className="h-full m-0">
                        <QualityTab user={user} selectedProject={selectedProject} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
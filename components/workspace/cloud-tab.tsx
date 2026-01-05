"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Zap, Shield } from "lucide-react"
import { DatabaseTab } from "./database-tab/database-tab"
import { AIPplatformTab } from "./ai-platform-tab"
import { AuditTab } from "./audit-tab"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface CloudTabProps {
    user: User
    selectedProject: Workspace | null
}

export function CloudTab({ user, selectedProject }: CloudTabProps) {
    const [activeCloudTab, setActiveCloudTab] = useState<"database" | "ai-platform" | "audit">("database")

    return (
        <div className="h-full flex flex-col">
            {/* Internal Tab Switcher */}
            <div className="border-b border-border bg-card p-2 flex-shrink-0">
                <Tabs value={activeCloudTab} onValueChange={(value) => setActiveCloudTab(value as "database" | "ai-platform" | "audit")}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="database" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span className="hidden sm:inline">Database</span>
                        </TabsTrigger>
                        <TabsTrigger value="ai-platform" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="hidden sm:inline">AI</span>
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="hidden sm:inline">Audit</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                <Tabs value={activeCloudTab} className="h-full">
                    <TabsContent value="database" className="h-full m-0">
                        <DatabaseTab workspaceId={selectedProject?.id || ""} />
                    </TabsContent>
                    <TabsContent value="ai-platform" className="h-full m-0">
                        <AIPplatformTab user={user} />
                    </TabsContent>
                    <TabsContent value="audit" className="h-full m-0">
                        <AuditTab user={user} selectedProject={selectedProject} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
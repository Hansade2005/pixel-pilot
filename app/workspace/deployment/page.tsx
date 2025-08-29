"use client"

import React, { Suspense } from "react"
// Prevent static prerendering; this page relies on client-side navigation hooks
export const dynamic = 'force-dynamic'
import { Loader2 } from "lucide-react"
import { GlobalHeader } from "../../../components/workspace/global-header"
import DeploymentClient from "@/components/workspace/deployment-client"

function DeploymentPageContent() {
  return <DeploymentClient />
}

export default function DeploymentPage() {
  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <DeploymentPageContent />
      </Suspense>
    </div>
  )
}

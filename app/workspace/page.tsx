import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WorkspaceLayout } from "@/components/workspace/workspace-layout"
import { storageManager } from "@/lib/storage-manager"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ newProject?: string; prompt?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  console.log('WorkspacePage - searchParams:', params)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Server-side rendering - always return empty projects array
  // Data will be loaded on client-side where IndexedDB is available
  console.log('WorkspacePage: Server-side rendering, returning empty workspaces array')
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />
      
      <div className="relative z-10 pt-16 pb-24">
        <WorkspaceLayout 
          user={user} 
          projects={[]} 
          newProjectId={params.newProject}
          initialPrompt={params.prompt}
        />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

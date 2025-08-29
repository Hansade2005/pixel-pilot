import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WorkspaceLayout } from "@/components/workspace/workspace-layout"
import { storageManager } from "@/lib/storage-manager"

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
  
  return <WorkspaceLayout 
    user={user} 
    projects={[]} 
    newProjectId={params.newProject}
    initialPrompt={params.prompt}
  />
}

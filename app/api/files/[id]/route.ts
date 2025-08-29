import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await request.json()
  const { content, name, path, workspaceId } = body
  const fileId = params.id

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
  }

  // Note: File operations should be handled client-side with IndexedDB
  // This endpoint is deprecated in favor of client-side file management
  return NextResponse.json({ 
    error: "This endpoint is deprecated. File operations should be handled client-side." 
  }, { status: 410 })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await request.json()
  const { workspaceId, path } = body

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!workspaceId || !path) {
    return NextResponse.json({ error: "Workspace ID and path are required" }, { status: 400 })
  }

  // Note: File operations should be handled client-side with IndexedDB
  // This endpoint is deprecated in favor of client-side file management
  return NextResponse.json({ 
    error: "This endpoint is deprecated. File operations should be handled client-side." 
  }, { status: 410 })
}

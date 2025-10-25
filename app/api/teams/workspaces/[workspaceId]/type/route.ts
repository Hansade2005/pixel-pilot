import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams/workspaces/[workspaceId]/type
// Quick check if workspace is team or personal
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = await createClient()

  try {
    const { data } = await supabase
      .from('team_workspaces')
      .select('id')
      .eq('id', params.workspaceId)
      .single()

    return NextResponse.json({
      isTeam: !!data,
      workspaceId: params.workspaceId
    })
  } catch (error) {
    console.error('Error checking workspace type:', error)
    return NextResponse.json({
      isTeam: false,
      workspaceId: params.workspaceId
    })
  }
}

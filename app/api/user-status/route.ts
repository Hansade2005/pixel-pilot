import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUserBlocked } from '@/lib/blocked-users'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ blocked: false })
    }

    const blockStatus = await checkUserBlocked(user.id, supabase)

    return NextResponse.json({
      blocked: blockStatus.isBlocked,
      reason: blockStatus.reason,
      message: blockStatus.notes
    })
  } catch {
    return NextResponse.json({ blocked: false })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Only allow server-side logic for auth, deployment, preview, chat
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Workspace operations must be performed client-side in the browser.' }, { status: 400 })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Workspace operations must be performed client-side in the browser.' }, { status: 400 })
}

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isCloudSyncEnabled, setCloudSyncEnabled } from '@/lib/cloud-sync'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    // Check if cloud sync is enabled
    const enabled = await isCloudSyncEnabled(user.id)
    
    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      cloudSyncEnabled: enabled
    })
  } catch (error: any) {
    console.error('Error checking cloud sync status:', error)
    return NextResponse.json({ error: error.message || 'Failed to check cloud sync status' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    const { enabled } = await request.json()
    
    // Get the user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    // Set cloud sync status
    const success = await setCloudSyncEnabled(user.id, enabled)
    
    return NextResponse.json({ 
      success,
      message: `Cloud sync ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error: any) {
    console.error('Error setting cloud sync status:', error)
    return NextResponse.json({ error: error.message || 'Failed to set cloud sync status' }, { status: 500 })
  }
}
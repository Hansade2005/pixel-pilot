import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { restoreBackupFromCloud } from '@/lib/cloud-sync'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    // Check if cloud sync is enabled
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('cloud_sync_enabled')
      .eq('user_id', user.id)
      .single()
    
    if (settingsError) {
      console.error('Error fetching user settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
    }
    
    if (!settings?.cloud_sync_enabled) {
      return NextResponse.json({ message: 'Cloud sync not enabled' })
    }
    
    // Restore backup from cloud
    const success = await restoreBackupFromCloud(user.id)
    
    if (success) {
      return NextResponse.json({ message: 'Backup restored successfully' })
    } else {
      return NextResponse.json({ message: 'No backup found or restoration failed' })
    }
  } catch (error: any) {
    console.error('Error restoring backup:', error)
    return NextResponse.json({ error: error.message || 'Failed to restore backup' }, { status: 500 })
  }
}
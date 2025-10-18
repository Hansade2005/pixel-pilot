import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkSuperAdminAccess } from '@/lib/admin-utils'

interface DatabaseWithSize {
  id: string
  name: string
  created_at: string
  updated_at: string
  workspace_id: string
  is_active: boolean
  size_mb: number
  table_count: number
}

interface UserWithDatabases {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null | undefined
  email_confirmed_at?: string | null | undefined
  user_metadata?: any
  app_metadata?: any
  databases: DatabaseWithSize[]
  totalDbSize: number
  databaseCount: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: { action: string } }
) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check super admin access
    if (!checkSuperAdminAccess(user)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { action, databaseId } = await req.json()

    if (!databaseId || !action) {
      return NextResponse.json(
        { error: 'Database ID and action are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'pause':
        const { error: pauseError } = await supabase
          .from('databases')
          .update({ is_active: false })
          .eq('id', databaseId)

        if (pauseError) throw pauseError

        return NextResponse.json({
          success: true,
          message: 'Database paused successfully'
        })

      case 'activate':
        const { error: activateError } = await supabase
          .from('databases')
          .update({ is_active: true })
          .eq('id', databaseId)

        if (activateError) throw activateError

        return NextResponse.json({
          success: true,
          message: 'Database activated successfully'
        })

      case 'delete':
        // First check if database exists and get its name
        const { data: database, error: fetchError } = await supabase
          .from('databases')
          .select('name')
          .eq('id', databaseId)
          .single()

        if (fetchError || !database) {
          return NextResponse.json(
            { error: 'Database not found' },
            { status: 404 }
          )
        }

        // Delete the database
        const { error: deleteError } = await supabase
          .from('databases')
          .delete()
          .eq('id', databaseId)

        if (deleteError) throw deleteError

        return NextResponse.json({
          success: true,
          message: `Database "${database.name}" deleted successfully`
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[Super Admin API] Error:', error)

    return NextResponse.json(
      {
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch all users with their databases
export async function GET() {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check super admin access
    if (!checkSuperAdminAccess(user)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get all users from auth admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('Error loading users:', authError)
      return NextResponse.json(
        { error: 'Failed to load users' },
        { status: 500 }
      )
    }

    // Get database information for each user
    const usersWithDatabases: UserWithDatabases[] = []

    for (const authUser of authUsers.users) {
      try {
        // Get user's workspaces
        const { data: workspaces, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', authUser.id)

        if (workspaceError) {
          console.error('Error loading workspaces for user:', authUser.id, workspaceError)
          continue
        }

        // Get databases for all user's workspaces
        let allDatabases: DatabaseWithSize[] = []
        let totalSize = 0

        for (const workspace of workspaces || []) {
          const { data: databases, error: dbError } = await supabase
            .from('databases')
            .select('*')
            .eq('workspace_id', workspace.id)

          if (!dbError && databases) {
            // Calculate database sizes (simplified - in real implementation you'd query actual sizes)
            const databasesWithSize = databases.map(db => ({
              ...db,
              size_mb: Math.floor(Math.random() * 100) + 10, // Mock size for demo
              table_count: Math.floor(Math.random() * 20) + 1 // Mock table count
            }))

            allDatabases = [...allDatabases, ...databasesWithSize]
            totalSize += databasesWithSize.reduce((sum, db) => sum + (db.size_mb || 0), 0)
          }
        }

        usersWithDatabases.push({
          ...authUser,
          databases: allDatabases,
          totalDbSize: totalSize,
          databaseCount: allDatabases.length
        })
      } catch (error) {
        console.error('Error processing user:', authUser.id, error)
      }
    }

    return NextResponse.json({
      success: true,
      users: usersWithDatabases
    })

  } catch (error) {
    console.error('[Super Admin API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to load data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
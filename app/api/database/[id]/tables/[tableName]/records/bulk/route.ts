import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params
    const { records } = await request.json()

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Invalid records provided' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Delete each record
    const deletePromises = records.map(async (record) => {
      let query = supabase.from(tableName).delete()
      
      // Use all fields from record to match
      Object.entries(record).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      return query
    })

    const results = await Promise.all(deletePromises)
    
    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('[API] Errors deleting records:', errors)
      return NextResponse.json(
        { 
          error: 'Some records failed to delete', 
          details: errors.map(e => e.error?.message).join(', '),
          successCount: results.length - errors.length,
          failureCount: errors.length
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: true,
      message: `${records.length} records deleted successfully`,
      count: records.length
    })
  } catch (error) {
    console.error('[API] Error in bulk record deletion:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params
    const { data } = await request.json()

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Insert record
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()

    if (error) {
      console.error('[API] Error inserting record:', error)
      return NextResponse.json(
        { error: 'Failed to insert record', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: insertedData,
      message: 'Record created successfully'
    })
  } catch (error) {
    console.error('[API] Error in record creation:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params
    const { data, originalRecord } = await request.json()

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Build where clause from original record to identify the row
    let query = supabase.from(tableName).update(data)
    
    // Use all fields from original record to match
    Object.entries(originalRecord).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data: updatedData, error } = await query.select()

    if (error) {
      console.error('[API] Error updating record:', error)
      return NextResponse.json(
        { error: 'Failed to update record', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Record updated successfully'
    })
  } catch (error) {
    console.error('[API] Error in record update:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params
    const { record } = await request.json()

    if (!record || typeof record !== 'object') {
      return NextResponse.json(
        { error: 'Invalid record provided' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Build where clause from record to identify the row
    let query = supabase.from(tableName).delete()
    
    // Use all fields from record to match
    Object.entries(record).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { error } = await query

    if (error) {
      console.error('[API] Error deleting record:', error)
      return NextResponse.json(
        { error: 'Failed to delete record', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully'
    })
  } catch (error) {
    console.error('[API] Error in record deletion:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

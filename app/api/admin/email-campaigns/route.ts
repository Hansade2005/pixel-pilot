import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin-utils"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get email campaigns
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching email campaigns:', error)
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error('Error in email campaigns API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, subject, content, recipientFilters, scheduledFor } = body

    if (!name || !type || !subject || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get recipient count based on filters
    let recipientCount = 0
    if (recipientFilters) {
      const { data: recipients, error: countError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('subscription_plan', recipientFilters.plan || 'free')

      if (!countError && recipients) {
        recipientCount = recipients.length
      }
    }

    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        name,
        type,
        subject,
        content,
        recipient_filters: recipientFilters || {},
        recipient_count: recipientCount,
        scheduled_for: scheduledFor,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email campaign:', error)
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error in email campaigns POST API:', error)
    return NextResponse.json(
      { error: 'Failed to create email campaign' },
      { status: 500 }
    )
  }
}
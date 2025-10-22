import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { operation, platform, metadata } = await request.json()

    // Record the usage
    const { error: insertError } = await supabase
      .from('usage_records')
      .insert({
        user_id: user.id,
        operation,
        platform,
        metadata,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error recording usage:', insertError)
      // Don't fail the request if recording fails, just log it
    }

    // Update deployment count if this is a deployment
    if (operation === 'deploy') {
      if (platform === 'github') {
        // Get current count and increment
        const { data: currentSettings } = await supabase
          .from('user_settings')
          .select('github_pushes_this_month')
          .eq('user_id', user.id)
          .single()

        const currentCount = currentSettings?.github_pushes_this_month || 0

        // Update GitHub push count
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({
            github_pushes_this_month: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating GitHub push count:', updateError)
        }
      } else {
        // Get current count and increment
        const { data: currentSettings } = await supabase
          .from('user_settings')
          .select('deployments_this_month')
          .eq('user_id', user.id)
          .single()

        const currentCount = currentSettings?.deployments_this_month || 0

        // Update general deployment count
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({
            deployments_this_month: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating deployment count:', updateError)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error recording usage:', error)
    return NextResponse.json(
      { error: 'Failed to record usage', success: false },
      { status: 500 }
    )
  }
}

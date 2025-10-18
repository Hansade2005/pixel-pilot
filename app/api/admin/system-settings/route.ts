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

    // Get all system settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key')

    if (error) {
      console.error('Error fetching system settings:', error)
      return NextResponse.json({ error: "Failed to fetch system settings" }, { status: 500 })
    }

    // Convert to key-value pairs for easier consumption
    const settingsMap: { [key: string]: any } = {}
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })

    // Ensure subscription system setting exists with default value
    if (!settingsMap['subscription_system_enabled']) {
      settingsMap['subscription_system_enabled'] = { enabled: false, updated_by: user.email, updated_at: new Date().toISOString() }
    }

    return NextResponse.json({
      settings: settingsMap,
      raw: settings
    })
  } catch (error) {
    console.error('Error in system settings API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
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
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json({ error: "Setting key is required" }, { status: 400 })
    }

    // Upsert the setting
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value: {
          ...value,
          updated_by: user.email,
          updated_at: new Date().toISOString()
        },
        description: description || `System setting: ${key}`
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating system setting:', error)
      return NextResponse.json({ error: "Failed to update system setting" }, { status: 500 })
    }

    // Log the admin action
    console.log(`[ADMIN] ${user.email} updated system setting: ${key}`, value)

    return NextResponse.json({
      success: true,
      setting: data
    })
  } catch (error) {
    console.error('Error in system settings POST API:', error)
    return NextResponse.json(
      { error: 'Failed to update system setting' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: "Boolean 'enabled' value is required" }, { status: 400 })
    }

    // Update the subscription system setting
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'subscription_system_enabled',
        value: {
          enabled,
          updated_by: user.email,
          updated_at: new Date().toISOString(),
          description: enabled ? 'Subscription system is active' : 'Free usage mode - no subscription charges'
        },
        description: 'Controls whether the subscription system is enabled'
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription system setting:', error)
      return NextResponse.json({ error: "Failed to update subscription system" }, { status: 500 })
    }

    // Log the admin action
    console.log(`[ADMIN] ${user.email} ${enabled ? 'enabled' : 'disabled'} subscription system`)

    return NextResponse.json({
      success: true,
      setting: data,
      message: `Subscription system ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('Error in system settings PATCH API:', error)
    return NextResponse.json(
      { error: 'Failed to toggle subscription system' },
      { status: 500 }
    )
  }
}

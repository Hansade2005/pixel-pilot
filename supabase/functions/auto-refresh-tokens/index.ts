 @ts-ignore https://esm.sh/@supabase/supabase-js@2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface TokenRefreshRequest {
  userId?: string
  forceRefresh?: boolean
}

interface TokenRefreshResponse {
  success: boolean
  message: string
  refreshedUsers?: number
  errors?: string[]
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, forceRefresh = false }: TokenRefreshRequest = req.method === 'POST'
      ? await req.json()
      : {}

    console.log(`[AUTO-REFRESH] Starting token refresh process`, { userId, forceRefresh })

    // Build query to find tokens that need refreshing
    let query = supabaseClient
      .from('user_settings')
      .select('user_id, supabase_refresh_token, supabase_token_expires_at')
      .not('supabase_refresh_token', 'is', null)
      .not('supabase_token_expires_at', 'is', null)

    // If specific user requested, filter by user_id
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // If not force refresh, only get tokens expiring within 5 minutes
    if (!forceRefresh) {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      query = query.lt('supabase_token_expires_at', fiveMinutesFromNow)
    }

    const { data: usersToRefresh, error: queryError } = await query

    if (queryError) {
      console.error('[AUTO-REFRESH] Error querying users:', queryError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to query users needing token refresh',
          error: queryError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!usersToRefresh || usersToRefresh.length === 0) {
      console.log('[AUTO-REFRESH] No users need token refresh')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users need token refresh',
          refreshedUsers: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[AUTO-REFRESH] Found ${usersToRefresh.length} users needing token refresh`)

    const results = []
    let successCount = 0
    const errors = []

    // Process each user
    for (const user of usersToRefresh) {
      try {
        console.log(`[AUTO-REFRESH] Refreshing token for user ${user.user_id}`)

        // Call Supabase OAuth token refresh endpoint
        const refreshResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(
              `${Deno.env.get('SUPABASE_CLIENT_ID') || '604f0920-a5bc-4d89-8994-32c10271c68e'}:${Deno.env.get('SUPABASE_CLIENT_SECRET') || 'sba_7a12fa8c38087f21d43fca948814427cebc8505c'}`
            )
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: user.supabase_refresh_token,
          })
        })

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok || !refreshData.access_token) {
          throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`)
        }

        // Calculate new expiration time
        const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()

        // Update user settings with new tokens
        const { error: updateError } = await supabaseClient
          .from('user_settings')
          .update({
            supabase_token: refreshData.access_token,
            supabase_refresh_token: refreshData.refresh_token || user.supabase_refresh_token, // Keep old refresh token if not provided
            supabase_token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id)

        if (updateError) {
          throw new Error(`Failed to update user settings: ${updateError.message}`)
        }

        console.log(`[AUTO-REFRESH] Successfully refreshed token for user ${user.user_id}`)
        successCount++

      } catch (error) {
        const errorMessage = `Failed to refresh token for user ${user.user_id}: ${error.message}`
        console.error(`[AUTO-REFRESH] ${errorMessage}`)
        errors.push(errorMessage)
      }
    }

    const response: TokenRefreshResponse = {
      success: successCount > 0,
      message: `Refreshed tokens for ${successCount} out of ${usersToRefresh.length} users`,
      refreshedUsers: successCount,
      errors: errors.length > 0 ? errors : undefined
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[AUTO-REFRESH] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Unexpected error during token refresh',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
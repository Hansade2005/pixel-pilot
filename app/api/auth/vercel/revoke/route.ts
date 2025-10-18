import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove Vercel token from user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        vercel_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Failed to remove Vercel token:', profileError)
      return Response.json({ 
        error: 'Failed to remove token',
        details: 'Could not remove token from profile'
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'Vercel token removed successfully'
    })

  } catch (error) {
    console.error('Vercel token revocation error:', error)
    return Response.json({ 
      error: 'Failed to remove Vercel token',
      details: 'An unexpected error occurred'
    }, { status: 500 })
  }
}

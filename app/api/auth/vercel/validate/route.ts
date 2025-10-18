import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { vercelToken } = await req.json()
    
    if (!vercelToken) {
      return Response.json({ error: 'Vercel token is required' }, { status: 400 })
    }

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Vercel token by making a test API call
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    })

    if (!response.ok) {
      return Response.json({ 
        error: 'Invalid Vercel token',
        details: 'The provided token is invalid or has expired'
      }, { status: 401 })
    }

    const userData = await response.json()

    // The token storage is now handled in client-side IndexedDB
    // Return user ID so client can store the token in IndexedDB
    // This is a key change - we no longer store tokens in Supabase
    return Response.json({
      userId: user.id,
      message: 'Token validated successfully',
      user: userData
    })

    return Response.json({
      success: true,
      message: 'Vercel token validated and stored successfully',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
      }
    })

  } catch (error) {
    console.error('Vercel token validation error:', error)
    return Response.json({ 
      error: 'Failed to validate Vercel token',
      details: 'An unexpected error occurred'
    }, { status: 500 })
  }
}

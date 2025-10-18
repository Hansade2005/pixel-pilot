import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return Response.json({ hasToken: false }, { status: 401 })
    }

    // Return success - actual token checking happens on client-side
    // since IndexedDB is only available in browser context
    return Response.json({ userId: user.id })
  } catch (error) {
    console.error('Vercel token check error:', error)
    return Response.json({ hasToken: false }, { status: 500 })
  }
}

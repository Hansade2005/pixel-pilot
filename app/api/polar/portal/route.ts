import { CustomerPortal } from "@polar-sh/nextjs"
import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  getCustomerId: async (req: NextRequest) => {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error("Unauthorized")
    }
    
    // Fetch the Polar customer ID from user_settings
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('polar_customer_id')
      .eq('user_id', user.id)
      .single()
    
    if (error || !userSettings?.polar_customer_id) {
      throw new Error("No Polar customer ID found")
    }
    
    return userSettings.polar_customer_id
  },
  returnUrl: "https://pipilot.dev/workspace/account",
  server: "production",
})

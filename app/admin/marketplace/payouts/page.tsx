import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin-utils'
import { AdminMarketplacePayoutManager } from '@/components/admin/marketplace-payout-manager'

export const metadata = {
  title: 'Payout Management | Admin Dashboard',
  description: 'Manage and process creator payout requests',
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin using email-based admin check
  if (!checkAdminAccess(user)) {
    redirect('/workspace')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AdminMarketplacePayoutManager />
    </div>
  )
}

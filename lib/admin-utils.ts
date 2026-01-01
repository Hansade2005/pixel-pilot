// Admin utilities and role management
const ADMIN_EMAILS = ['hanscadx8@gmail.com','hansade2005@gmail.com']
const SUPER_ADMIN_EMAILS = ['hanscadx8@gmail.com','hansade2005@gmail.com'] // Only specific super admins

export function isAdmin(email: string | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false
}

export function isSuperAdmin(email: string | undefined): boolean {
  return email ? SUPER_ADMIN_EMAILS.includes(email.toLowerCase()) : false
}

export function checkAdminAccess(user: any): boolean {
  if (!user || !user.email) return false
  return isAdmin(user.email)
}

export function checkSuperAdminAccess(user: any): boolean {
  if (!user || !user.email) return false
  return isSuperAdmin(user.email)
}

// Admin-specific permissions
export const ADMIN_PERMISSIONS = {
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',
  VIEW_ANALYTICS: 'view_analytics',
  SYSTEM_MANAGEMENT: 'system_management',
  EXPORT_DATA: 'export_data',
  SUPER_ADMIN: 'super_admin',
  DOMAIN_MANAGEMENT: 'domain_management',
  EMAIL_MANAGEMENT: 'email_management'
}

export function hasAdminPermission(user: any, permission: string): boolean {
  if (!checkAdminAccess(user)) return false

  // Super admin has all permissions
  if (isSuperAdmin(user.email)) return true

  // Regular admin permissions
  return Object.values(ADMIN_PERMISSIONS).includes(permission)
}

// Admin menu items
export const ADMIN_MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'BarChart3',
    href: '/admin',
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS
  },
  {
    id: 'domains',
    label: 'Domain Management',
    icon: 'Globe',
    href: '/admin/domains',
    permission: ADMIN_PERMISSIONS.DOMAIN_MANAGEMENT
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'Users',
    href: '/admin/users',
    permission: ADMIN_PERMISSIONS.VIEW_USERS
  },
  {
    id: 'billing',
    label: 'Billing & Subscriptions',
    icon: 'CreditCard',
    href: '/admin/billing',
    permission: ADMIN_PERMISSIONS.VIEW_BILLING
  },
  {
    id: 'wallets',
    label: 'API Wallets',
    icon: 'Wallet',
    href: '/admin/wallets',
    permission: ADMIN_PERMISSIONS.MANAGE_BILLING
  },
  {
    id: 'credits',
    label: 'User Credits',
    icon: 'CreditCard',
    href: '/admin/credits',
    permission: ADMIN_PERMISSIONS.MANAGE_BILLING
  },
  {
    id: 'marketplace',
    label: 'Templates Marketplace',
    icon: 'ShoppingCart',
    href: '/admin/marketplace',
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS
  },
  {
    id: 'payouts',
    label: 'Payout Management',
    icon: 'DollarSign',
    href: '/admin/marketplace/payouts',
    permission: ADMIN_PERMISSIONS.MANAGE_BILLING
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    href: '/admin/analytics',
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS
  },
  {
    id: 'email',
    label: 'Email Campaigns',
    icon: 'Mail',
    href: '/admin/email',
    permission: ADMIN_PERMISSIONS.EMAIL_MANAGEMENT
  },
  {
    id: 'leads-email',
    label: 'Leads Cold Email',
    icon: 'Sparkles',
    href: '/admin/leads-email',
    permission: ADMIN_PERMISSIONS.EMAIL_MANAGEMENT
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'Bell',
    href: '/admin/notifications',
    permission: ADMIN_PERMISSIONS.EMAIL_MANAGEMENT
  },
  {
    id: 'system',
    label: 'System Settings',
    icon: 'Settings',
    href: '/admin/system',
    permission: ADMIN_PERMISSIONS.SYSTEM_MANAGEMENT
  }
]

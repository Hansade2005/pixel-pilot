// Admin utilities and role management
const ADMIN_EMAILS = ['hanscadx8@gmail.com','hansade2005@gmail.com']
const SUPER_ADMIN_EMAILS = ['hansade2005@gmail.com'] // Only specific super admins

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
  SUPER_ADMIN: 'super_admin'
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
    id: 'users',
    label: 'User Management',
    icon: 'Users',
    href: '/admin/users',
    permission: ADMIN_PERMISSIONS.VIEW_USERS
  },
  {
    id: 'email',
    label: 'Email Management',
    icon: 'Mail',
    href: '/admin/email',
    permission: ADMIN_PERMISSIONS.MANAGE_USERS
  },
  {
    id: 'billing',
    label: 'Billing & Subscriptions',
    icon: 'CreditCard',
    href: '/admin/billing',
    permission: ADMIN_PERMISSIONS.VIEW_BILLING
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    href: '/admin/analytics',
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS
  },
  {
    id: 'system',
    label: 'System Settings',
    icon: 'Settings',
    href: '/admin/system',
    permission: ADMIN_PERMISSIONS.SYSTEM_MANAGEMENT
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: 'Shield',
    href: '/admin/super-admin',
    permission: ADMIN_PERMISSIONS.SUPER_ADMIN
  }
]

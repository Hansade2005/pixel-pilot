// Stripe Product and Pricing Configuration
// This file defines all our products, prices, and features

export interface ProductConfig {
  id: string
  name: string
  description: string
  features: string[]
  limits: {
    credits: number
    appDeploys: number
    storage?: string
    users?: number
  }
  prices: {
    monthly: {
      amount: number
      stripePriceId: string
    }
    yearly: {
      amount: number
      stripePriceId: string
      savings: string
    }
  }
}

export const PRODUCT_CONFIGS: Record<string, ProductConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with AI-powered development',
    features: [
      '25 prompt credits/month',
      'Auto model - perfect for quick prototyping',
      'Project creation and basic editing',
      '2 week Pro trial',
      'Community support',
      'Basic deployment (1 project/month)'
    ],
    limits: {
      credits: 25,
      appDeploys: 1
    },
    prices: {
      monthly: {
        amount: 0,
        stripePriceId: ''
      },
      yearly: {
        amount: 0,
        stripePriceId: '',
        savings: '0%'
      }
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Perfect for individual developers and small teams',
    features: [
      'Everything in Free, plus:',
      '500 prompt credits/month',
      'All premium models (OpenAI, Claude, Gemini, xAI)',
      'SWE-1 model - specialized coding AI (0 credits)',
      'Advanced project management',
      'Add-on credits at $10/250 credits',
      'Optional zero data retention',
      'Unlimited Fast Tab & Command',
      'Real-time previews',
      '1 App Deploy / day',
      'Priority support',
      'Custom project templates'
    ],
    limits: {
      credits: 500,
      appDeploys: 1,
      storage: '10GB'
    },
    prices: {
      monthly: {
        amount: 15,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly_id'
      },
      yearly: {
        amount: 180,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly_id',
        savings: '20%'
      }
    }
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'Advanced collaboration tools for growing teams',
    features: [
      'Everything in Pro, plus:',
      '500 prompt credits/user/month',
      'Team project collaboration',
      'Shared project workspaces',
      'Add-on credits at $40/1000 credits',
      'Centralized billing & admin dashboard',
      'Advanced analytics & reporting',
      'Automated zero data retention',
      'SSO available for +$10/user/month',
      '5 App Deploys / day',
      'Role-based project permissions',
      'Team code reviews & feedback'
    ],
    limits: {
      credits: 500,
      appDeploys: 5,
      storage: '100GB',
      users: 50
    },
    prices: {
      monthly: {
        amount: 30,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY || 'price_teams_monthly_id'
      },
      yearly: {
        amount: 360,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAMS_YEARLY || 'price_teams_yearly_id',
        savings: '20%'
      }
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Complete solution for large organizations',
    features: [
      'Everything in Teams, plus:',
      '1,000 prompt credits/user/month',
      'Enterprise project portfolio management',
      'Multi-organization support',
      'Add-on credits at $40/1000 credits',
      'Full RBAC & advanced permissions',
      'SSO + enterprise access control',
      'Volume discounts (>200 seats)',
      'Dedicated account management',
      'Hybrid & on-premise deployment',
      'Custom integrations & APIs',
      'Advanced security & compliance',
      '24/7 premium support',
      'Custom project workflows'
    ],
    limits: {
      credits: 1000,
      appDeploys: 50,
      storage: 'Unlimited',
      users: 1000
    },
    prices: {
      monthly: {
        amount: 60,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly_id'
      },
      yearly: {
        amount: 720,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly_id',
        savings: '20%'
      }
    }
  }
}

// Helper functions
export function getProductConfig(planId: string): ProductConfig | null {
  return PRODUCT_CONFIGS[planId] || null
}

export function getPriceId(planId: string, isAnnual: boolean): string | null {
  const config = getProductConfig(planId)
  if (!config) return null

  return isAnnual ? config.prices.yearly.stripePriceId : config.prices.monthly.stripePriceId
}

export function getPrice(planId: string, isAnnual: boolean): number {
  const config = getProductConfig(planId)
  if (!config) return 0

  return isAnnual ? config.prices.yearly.amount : config.prices.monthly.amount
}

export function getSavings(planId: string, isAnnual: boolean): string | null {
  if (!isAnnual) return null

  const config = getProductConfig(planId)
  if (!config) return null

  return config.prices.yearly.savings
}

export function getLimits(planId: string) {
  const config = getProductConfig(planId)
  return config?.limits || { credits: 25, appDeploys: 1 }
}

// Stripe Product IDs (to be created in Stripe dashboard)
export const STRIPE_PRODUCT_IDS = {
  PRO: process.env.STRIPE_PRODUCT_PRO || 'prod_pro_id',
  TEAMS: process.env.STRIPE_PRODUCT_TEAMS || 'prod_teams_id',
  ENTERPRISE: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise_id'
}

// Stripe Product and Pricing Configuration
// This file defines all our products, prices, and features

import { chatModels } from '@/lib/ai-models'

// Get all available model IDs for premium plans
const ALL_MODEL_IDS = chatModels.map(model => model.id)

export interface ProductConfig {
  id: string
  name: string
  description: string
  features: string[]
  limits: {
    deploymentPlatforms: string[]
    deploymentsPerMonth: number
    githubPushesPerMonth?: number
    canUseVercel: boolean
    canUseNetlify: boolean
    canUseGitHub: boolean
    unlimitedPrompts: boolean
    allowedModels: string[]
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
      'GitHub repository creation (2 pushes/month)',
      'Deploy to Netlify only',
      'Limited to 5 deployments per month',
      'Basic project templates',
      'Community support'
    ],
    limits: {
      deploymentPlatforms: ['netlify'],
      deploymentsPerMonth: 5,
      githubPushesPerMonth: 2,
      canUseVercel: false,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: false,
      allowedModels: ['auto', 'a0-dev-llm']
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
    description: 'Professional AI development for serious developers',
    features: [
      'Everything in Free, plus:',
      'Unlimited prompts and messages',
      'Deploy to Vercel and Netlify',
      '10 deployments per month (combined)',
      'All premium AI models (GPT-4, Claude, Gemini)',
      'Advanced project management',
      'Real-time previews & debugging',
      'Priority support',
      'Custom project templates',
      'Unlimited GitHub pushes',
      'Full-stack application generation',
      'Production-ready deployments'
    ],
    limits: {
      deploymentPlatforms: ['vercel', 'netlify'],
      deploymentsPerMonth: 10,
      canUseVercel: true,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: true,
      allowedModels: ALL_MODEL_IDS,
      storage: 'Unlimited'
    },
    prices: {
      monthly: {
        amount: 29,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly_id'
      },
      yearly: {
        amount: 279,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly_id',
        savings: '20%'
      }
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Coming soon - Advanced enterprise features',
    features: [
      'Everything in Pro, plus:',
      'Team collaboration tools',
      'Advanced analytics',
      'Dedicated support',
      'Custom integrations',
      'Enterprise security features'
    ],
    limits: {
      deploymentPlatforms: ['vercel', 'netlify'],
      deploymentsPerMonth: 50,
      canUseVercel: true,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: true,
      allowedModels: ALL_MODEL_IDS,
      storage: 'Unlimited',
      users: 100
    },
    prices: {
      monthly: {
        amount: 0, // Coming soon
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly_id'
      },
      yearly: {
        amount: 0, // Coming soon
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly_id',
        savings: '0%'
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
  return config?.limits || {
    deploymentPlatforms: ['netlify'],
    deploymentsPerMonth: 5,
    githubPushesPerMonth: 2,
    canUseVercel: false,
    canUseNetlify: true,
    canUseGitHub: true,
    unlimitedPrompts: false,
    allowedModels: ['auto']
  }
}

export function canUseModel(planId: string, modelId: string): boolean {
  const limits = getLimits(planId)
  return limits.allowedModels.includes(modelId)
}

// Stripe Product IDs (to be created in Stripe dashboard)
export const STRIPE_PRODUCT_IDS = {
  PRO: process.env.STRIPE_PRODUCT_PRO || 'prod_pro_id',
  TEAMS: process.env.STRIPE_PRODUCT_TEAMS || 'prod_teams_id',
  ENTERPRISE: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise_id'
}

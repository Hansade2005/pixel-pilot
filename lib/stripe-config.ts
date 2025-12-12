// Stripe Product and Pricing Configuration
// This file defines all our products, prices, and features

import { chatModels } from '@/lib/ai-models'
import { getExchangeRates, convertUsdToCad, formatPrice } from '@/lib/currency-converter'

// Get all available model IDs for premium plans
const ALL_MODEL_IDS = chatModels.map(model => model.id)

export interface ProductConfig {
  id: string
  name: string
  description: string
  features: string[]
  limits: {
    credits: number
    messages: number
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
    canPurchaseCredits: boolean
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
    description: 'Community Tier',
    features: [
      'Basic AI chat & code generation',
      'Deploy to Vercel',
      'Visual editing with Design Mode',
      'GitHub sync',
      '1 app/project',
      'Public/open-source unlimited'
    ],
    limits: {
      credits: 20,
      messages: 80,
      deploymentPlatforms: ['vercel'],
      deploymentsPerMonth: 5,
      githubPushesPerMonth: 2,
      canUseVercel: true,
      canUseNetlify: false,
      canUseGitHub: true,
      unlimitedPrompts: false,
      allowedModels: ['auto', 'a0-dev-llm', 'grok-3-mini'],
      canPurchaseCredits: false
    },
    prices: {
      monthly: {
        amount: 0,
        stripePriceId: 'price_1SZ9843G7U0M1bp1WcX6j6b1'
      },
      yearly: {
        amount: 0,
        stripePriceId: 'price_1SZ9843G7U0M1bp1WcX6j6b1',
        savings: '0%'
      }
    }
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    description: 'Individual Tier',
    features: [
      'All Free features',
      '$50 of included monthly credits',
      '5x higher attachment size limits',
      'Import from Figma',
      'Custom domains',
      'Remove PiPilot badge',
      '10% revenue share on monetized apps',
      'Unlimited credit purchases'
    ],
    limits: {
      credits: 50,
      messages: 200,
      deploymentPlatforms: ['vercel', 'netlify'],
      deploymentsPerMonth: 10,
      canUseVercel: true,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: true,
      allowedModels: ALL_MODEL_IDS,
      storage: 'Unlimited',
      canPurchaseCredits: true
    },
    prices: {
      monthly: {
        amount: 15,
        stripePriceId: 'price_1SZ98W3G7U0M1bp1u30VJE2V'
      },
      yearly: {
        amount: 144,
        stripePriceId: 'price_1SZTlN3G7U0M1bp1Us7dGSSg',
        savings: '20%'
      }
    }
  },
  collaborate: {
    id: 'collaborate',
    name: 'Collaborate',
    description: 'Team Tier',
    features: [
      'All Creator features',
      'Shared across unlimited users',
      'Centralized billing on Vercel',
      'Share chats and collaborate',
      'User roles & permissions',
      '15% revenue share',
      'Unlimited credit purchases (shared pool)'
    ],
    limits: {
      credits: 75,
      messages: 300,
      deploymentPlatforms: ['vercel', 'netlify'],
      deploymentsPerMonth: 20,
      canUseVercel: true,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: true,
      allowedModels: ALL_MODEL_IDS,
      storage: 'Unlimited',
      users: 100,
      canPurchaseCredits: true
    },
    prices: {
      monthly: {
        amount: 25,
        stripePriceId: 'price_1SZ98n3G7U0M1bp1DipaxRvq'
      },
      yearly: {
        amount: 240,
        stripePriceId: 'price_1SZTmV3G7U0M1bp1GrNHBxUg',
        savings: '20%'
      }
    }
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    description: 'Enterprise Tier',
    features: [
      'All Collaborate features',
      'Internal publish',
      'SSO',
      'Personal projects',
      'Opt out of data training',
      'Design templates',
      '20% revenue share',
      'Unlimited credit purchases (shared pool)'
    ],
    limits: {
      credits: 150,
      messages: 600,
      deploymentPlatforms: ['vercel', 'netlify'],
      deploymentsPerMonth: 50,
      canUseVercel: true,
      canUseNetlify: true,
      canUseGitHub: true,
      unlimitedPrompts: true,
      allowedModels: ALL_MODEL_IDS,
      storage: 'Unlimited',
      users: 1000,
      canPurchaseCredits: true
    },
    prices: {
      monthly: {
        amount: 60,
        stripePriceId: 'price_1SZ98v3G7U0M1bp1YAD89Tx4'
      },
      yearly: {
        amount: 576,
        stripePriceId: 'price_1SZToP3G7U0M1bp1v0AWlXZ6',
        savings: '20%'
      }
    }
  }
}

// Extra Credits Product
export const EXTRA_CREDITS_PRODUCT = {
  id: 'extra-credits',
  name: 'Extra Credits',
  description: 'Purchase additional credits for paid plans',
  stripePriceId: 'price_1SZ9923G7U0M1bp18UU5eKQ8',
  pricePerCredit: 1
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
    credits: 20,
    messages: 80,
    deploymentPlatforms: ['vercel'],
    deploymentsPerMonth: 5,
    githubPushesPerMonth: 2,
    canUseVercel: true,
    canUseNetlify: false,
    canUseGitHub: true,
    unlimitedPrompts: false,
    allowedModels: ['auto'],
    canPurchaseCredits: false
  }
}

export function canUseModel(planId: string, modelId: string): boolean {
  const limits = getLimits(planId)
  return limits.allowedModels.includes(modelId)
}

export function canPurchaseCredits(planId: string): boolean {
  const limits = getLimits(planId)
  return limits.canPurchaseCredits
}

// Stripe Product IDs (hardcoded)
export const STRIPE_PRODUCT_IDS = {
  FREE: 'prod_TWBUUaESS42Lhe',
  CREATOR: 'prod_TWBVaEqAk1898D',
  COLLABORATE: 'prod_TWBVEKvyCu0hYP',
  SCALE: 'prod_TWBVHmYvmfFQMA',
  EXTRA_CREDITS: 'prod_TWBWlx7GadNZK1'
}

// Currency conversion helpers for CAD display
export async function getPriceInCAD(usdPrice: number): Promise<number> {
  try {
    const rates = await getExchangeRates()
    return convertUsdToCad(usdPrice, rates.CAD)
  } catch (error) {
    console.error('Failed to get CAD price:', error)
    // Fallback to approximate conversion
    return parseFloat((usdPrice * 1.35).toFixed(2))
  }
}

export async function formatPriceForDisplay(usdPrice: number, currency: 'USD' | 'CAD' = 'CAD'): Promise<string> {
  if (currency === 'USD') {
    return formatPrice(usdPrice, 'USD')
  }
  
  const cadPrice = await getPriceInCAD(usdPrice)
  return formatPrice(cadPrice, 'CAD')
}

export async function getExchangeRateForDisplay(): Promise<number> {
  try {
    const rates = await getExchangeRates()
    return rates.CAD
  } catch (error) {
    return 1.35
  }
}

/**
 * Polar Payment Configuration
 * 
 * Backup payment system for PiPilot subscriptions.
 * Products created in Polar dashboard.
 */

export const POLAR_CONFIG = {
  // Access token from environment
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  
  // Server environment
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  
  // URLs
  successUrl: process.env.POLAR_SUCCESS_URL || "https://pipilot.dev/polar/success?checkout_id={CHECKOUT_ID}",
  returnUrl: process.env.POLAR_RETURN_URL || "https://pipilot.dev/pricing",
  
  // Product IDs - Monthly Plans
  products: {
    creator: {
      monthly: "564448a6-d74c-46fd-bab4-2bd20e662492",
      yearly: "585bf799-1959-4ea7-8a60-af1012b9aaf2",
    },
    collaborate: {
      monthly: "6d78885f-c1b2-4021-bc8c-7d8190c7f187",
      yearly: "fa11d932-181a-4908-b201-60d8f4230b2c",
    },
    scale: {
      monthly: "5c514c1b-f103-4842-addb-54322fd5437f",
      yearly: "740e64cf-d1c3-4d70-a149-54863bc4cb58",
    },
  },
  
  // Pricing (in cents)
  pricing: {
    creator: {
      monthly: 1500, // $15/month
      yearly: 14400, // $144/year (20% off)
    },
    collaborate: {
      monthly: 2500, // $25/month
      yearly: 24000, // $240/year (20% off)
    },
    scale: {
      monthly: 6000, // $60/month
      yearly: 57600, // $576/year (20% off)
    },
  },
  
  // Credits per plan
  credits: {
    creator: 50,
    collaborate: 75,
    scale: 150,
  },
} as const

export type PolarPlan = "creator" | "collaborate" | "scale"
export type BillingInterval = "monthly" | "yearly"

/**
 * Get Polar product ID for a plan
 */
export function getPolarProductId(plan: PolarPlan, interval: BillingInterval = "monthly"): string {
  return POLAR_CONFIG.products[plan][interval]
}

/**
 * Get plan details from Polar product ID
 */
export function getPlanFromPolarProductId(productId: string): { plan: PolarPlan; interval: BillingInterval } | null {
  for (const [plan, intervals] of Object.entries(POLAR_CONFIG.products)) {
    for (const [interval, id] of Object.entries(intervals)) {
      if (id === productId) {
        return { plan: plan as PolarPlan, interval: interval as BillingInterval }
      }
    }
  }
  return null
}

/**
 * Get price for a plan (in cents)
 */
export function getPolarPrice(plan: PolarPlan, interval: BillingInterval = "monthly"): number {
  return POLAR_CONFIG.pricing[plan][interval]
}

/**
 * Get credits for a plan
 */
export function getPolarCredits(plan: PolarPlan): number {
  return POLAR_CONFIG.credits[plan]
}

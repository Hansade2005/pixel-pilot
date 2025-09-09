import Stripe from "stripe"

// Fallback Stripe API key
const FALLBACK_STRIPE_SECRET_KEY = "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"

// Only initialize Stripe if environment variables are available
// This prevents build-time errors when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null

function initializeStripe() {
  const primaryKey = process.env.STRIPE_SECRET_KEY
  const fallbackKey = FALLBACK_STRIPE_SECRET_KEY

  // Try primary key first
  if (primaryKey) {
    try {
      console.log("Initializing Stripe with primary key...")
      stripeInstance = new Stripe(primaryKey, {
        apiVersion: "2025-08-27.basil",
        typescript: true,
      })

      console.log("Stripe primary key initialized successfully")
      return
    } catch (error) {
      console.warn("Primary Stripe key failed, trying fallback:", error)
    }
  }

  // Try fallback key if primary fails
  if (fallbackKey) {
    try {
      console.log("Initializing Stripe with fallback key...")
      stripeInstance = new Stripe(fallbackKey, {
        apiVersion: "2025-08-27.basil",
        typescript: true,
      })

      console.log("Stripe fallback key initialized successfully")
      return
    } catch (error) {
      console.error("Fallback Stripe key also failed:", error)
    }
  }

  console.error("Both primary and fallback Stripe keys failed to initialize")
  stripeInstance = null
}

// Initialize Stripe on module load
initializeStripe()

export const stripe = stripeInstance

export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  secretKey: process.env.STRIPE_SECRET_KEY || FALLBACK_STRIPE_SECRET_KEY,
}

// Client-side Stripe configuration for publishable key only usage
export const getClientStripeConfig = () => ({
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
})

// Price IDs for different plans (you'll need to create these in Stripe)
export const STRIPE_PRICES = {
  PRO: process.env.STRIPE_PRICE_PRO || "price_pro_id",
  TEAMS: process.env.STRIPE_PRICE_TEAMS || "price_teams_id",
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise_id",
}

export const PLAN_LIMITS = {
  FREE: {
    deploymentsPerMonth: 5,
    githubPushesPerMonth: 2,
    canUseVercel: false,
    canUseNetlify: true,
    canUseGitHub: true,
    unlimitedPrompts: false,
    features: ["auto_model", "basic_projects"]
  },
  PRO: {
    deploymentsPerMonth: 10,
    githubPushesPerMonth: null, // unlimited
    canUseVercel: true,
    canUseNetlify: true,
    canUseGitHub: true,
    unlimitedPrompts: true,
    features: ["all_models", "advanced_projects", "custom_templates", "premium_ai_models"]
  },
  TEAMS: {
    deploymentsPerMonth: 25,
    githubPushesPerMonth: null, // unlimited
    canUseVercel: true,
    canUseNetlify: true,
    canUseGitHub: true,
    unlimitedPrompts: true,
    features: ["all_models", "team_collaboration", "advanced_projects", "analytics", "premium_ai_models"]
  },
  ENTERPRISE: {
    deploymentsPerMonth: 50,
    githubPushesPerMonth: null, // unlimited
    canUseVercel: true,
    canUseNetlify: true,
    canUseGitHub: true,
    unlimitedPrompts: true,
    features: ["all_models", "enterprise_features", "custom_integrations", "dedicated_support", "premium_ai_models"]
  }
}

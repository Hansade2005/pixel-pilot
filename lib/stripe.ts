import Stripe from "stripe"

// Only initialize Stripe if environment variables are available
// This prevents build-time errors when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    })
  }
} catch (error) {
  console.warn("Failed to initialize Stripe:", error)
  stripeInstance = null
}

export const stripe = stripeInstance

export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  secretKey: process.env.STRIPE_SECRET_KEY || "",
}

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

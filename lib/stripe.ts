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
    credits: 25,
    appDeploys: 1,
    features: ["auto_model", "basic_projects"]
  },
  PRO: {
    credits: 500,
    appDeploys: 1,
    features: ["all_models", "swe1", "advanced_projects", "custom_templates"]
  },
  TEAMS: {
    credits: 500,
    appDeploys: 5,
    features: ["all_models", "swe1", "team_collaboration", "advanced_projects", "analytics"]
  },
  ENTERPRISE: {
    credits: 1000,
    appDeploys: 50,
    features: ["all_models", "swe1", "enterprise_features", "custom_integrations", "dedicated_support"]
  }
}

import { Checkout } from "@polar-sh/nextjs"
import { NextRequest } from "next/server"

/**
 * Polar Checkout API Route
 * 
 * Creates a checkout session for Polar subscriptions.
 * This serves as a backup payment system alongside Stripe.
 * 
 * Usage: GET /api/polar/checkout?product=creator|collaborate|scale
 */

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.POLAR_SUCCESS_URL || "http://localhost:3000/polar/success?checkout_id={CHECKOUT_ID}",
  returnUrl: process.env.POLAR_RETURN_URL || "http://localhost:3000/pricing",
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
  theme: "dark",
})

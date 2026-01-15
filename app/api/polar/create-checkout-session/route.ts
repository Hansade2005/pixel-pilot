import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { POLAR_CONFIG, getPolarProductId, type PolarPlan, type BillingInterval } from "@/lib/polar-config"

/**
 * Create Polar Checkout Session
 * 
 * Creates a Polar checkout for subscription purchases.
 * Alternative to Stripe for users who prefer Polar.
 * 
 * POST /api/polar/create-checkout-session
 * Body: { plan: "creator" | "collaborate" | "scale", interval?: "monthly" | "yearly" }
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan, interval = "monthly" } = await request.json()

    if (!plan || !["creator", "collaborate", "scale"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    if (!["monthly", "yearly"].includes(interval)) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 })
    }

    // Get Polar product ID from config
    const productId = getPolarProductId(plan as PolarPlan, interval as BillingInterval)

    if (!productId) {
      return NextResponse.json(
        { error: "Polar product not configured for this plan" },
        { status: 500 }
      )
    }

    // Create checkout session via Polar API
    const checkoutResponse = await fetch("https://api.polar.sh/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POLAR_CONFIG.accessToken}`,
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: user.email,
        success_url: POLAR_CONFIG.successUrl,
        metadata: {
          user_id: user.id,
          plan: plan,
          interval: interval,
        },
      }),
    })

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text()
      console.error("Polar checkout creation failed:", error)
      return NextResponse.json(
        { error: "Failed to create Polar checkout session" },
        { status: 500 }
      )
    }

    const checkout = await checkoutResponse.json()

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    })
  } catch (error) {
    console.error("Error creating Polar checkout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

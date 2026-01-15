import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { POLAR_CONFIG, getPlanFromPolarProductId, getPolarCredits } from "@/lib/polar-config"
import { addCredits } from "@/lib/billing/credit-manager"

/**
 * Polar Success Handler
 * 
 * Handles successful Polar checkout completion.
 * Updates user subscription in database after payment.
 * 
 * Query params:
 * - checkout_id: The Polar checkout session ID
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const checkoutId = searchParams.get("checkout_id")

    if (!checkoutId) {
      return NextResponse.redirect(new URL("/pricing?error=no_checkout_id", request.url))
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(new URL("/auth/login?error=unauthorized", request.url))
    }

    // Fetch checkout details from Polar API
    const polarResponse = await fetch(
      `https://api.polar.sh/v1/checkouts/${checkoutId}`,
      {
        headers: {
          Authorization: `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    )

    if (!polarResponse.ok) {
      console.error("Failed to fetch Polar checkout:", await polarResponse.text())
      return NextResponse.redirect(
        new URL("/pricing?error=polar_fetch_failed", request.url)
      )
    }

    const checkout = await polarResponse.json()

    // Check if this is a credit top-up or subscription
    const purchaseType = checkout.metadata?.purchase_type
    
    if (purchaseType === 'credit_topup') {
      // Handle credit top-up purchase
      const creditsAmount = parseInt(checkout.metadata.credits || '0', 10)
      
      if (creditsAmount <= 0) {
        return NextResponse.redirect(
          new URL("/pricing?error=invalid_credits", request.url)
        )
      }

      // Add credits to user's wallet using credit-manager
      const creditAdded = await addCredits(
        user.id,
        creditsAmount,
        'purchase',
        `Polar credit top-up: ${creditsAmount} credits`,
        supabase,
        checkoutId
      )

      if (!creditAdded) {
        console.error("Error adding credits for user:", user.id)
        return NextResponse.redirect(
          new URL("/pricing?error=credit_add_failed", request.url)
        )
      }

      // Update polar customer ID if not set
      await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          polar_customer_id: checkout.customer_id,
          polar_checkout_id: checkoutId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      return NextResponse.redirect(
        new URL(`/workspace/account?success=credit_topup&credits=${creditsAmount}`, request.url)
      )
    }

    // Handle subscription purchase
    // Get plan details from product ID
    const planDetails = getPlanFromPolarProductId(checkout.product_id)
    
    if (!planDetails) {
      console.error("Unknown Polar product ID:", checkout.product_id)
      return NextResponse.redirect(
        new URL("/pricing?error=unknown_product", request.url)
      )
    }

    const { plan: planName, interval } = planDetails

    // Legacy plan mapping for user_settings table
    const legacyPlanMap: Record<string, string> = {
      creator: "pro",
      collaborate: "teams",
      scale: "enterprise",
    }

    // Update user subscription in both tables
    const [userSettingsUpdate, walletUpdate] = await Promise.all([
      // Update user_settings with legacy name
      supabase
        .from("user_settings")
        .update({
          subscription_plan: legacyPlanMap[planName] || planName,
          subscription_status: "active",
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          polar_customer_id: checkout.customer_id,
          polar_checkout_id: checkoutId,
          payment_provider: "polar",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id),

      // Update wallet with new canonical name
      supabase
        .from("wallet")
        .update({
          current_plan: planName,
          payment_provider: "polar",
        })
        .eq("user_id", user.id),
    ])

    if (userSettingsUpdate.error) {
      console.error("Error updating user_settings:", userSettingsUpdate.error)
    }

    if (walletUpdate.error) {
      console.error("Error updating wallet:", walletUpdate.error)
    }

    // Replenish credits based on plan
    const creditsToAdd = getPolarCredits(planName)

    await addCredits(
      user.id,
      creditsToAdd,
      'subscription_grant',
      `Polar subscription: ${planName} plan - ${interval} billing`,
      supabase,
      checkoutId
    )

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/workspace?success=polar_subscription&plan=${planName}&interval=${interval}`, request.url)
    )
  } catch (error) {
    console.error("Error in Polar success handler:", error)
    return NextResponse.redirect(
      new URL("/pricing?error=polar_processing_failed", request.url)
    )
  }
}

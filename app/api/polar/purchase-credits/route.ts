import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { POLAR_CONFIG, getPolarCreditProductId, getPolarCreditPrice } from "@/lib/polar-config"
import { canPurchaseCredits } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { credits } = await request.json()

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json({ error: "Valid credits amount is required" }, { status: 400 })
    }

    // Check if user can purchase credits (not free plan)
    const { data: wallet } = await supabase
      .from('wallet')
      .select('current_plan')
      .eq('user_id', user.id)
      .single()

    if (!wallet || !canPurchaseCredits(wallet.current_plan)) {
      return NextResponse.json({
        error: "Credit purchases are only available for paid plans"
      }, { status: 403 })
    }

    // Get or create Polar customer ID
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('polar_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = userSettings?.polar_customer_id

    // If no customer ID, create one during checkout
    if (!customerId) {
      // Polar will create customer on first checkout
      customerId = undefined
    }

    // Create Polar checkout for credit purchase
    const polarResponse = await fetch('https://api.polar.sh/v1/checkouts/custom', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_price_id: getPolarCreditProductId(),
        customer_email: user.email,
        ...(customerId && { customer_id: customerId }),
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://pipilot.dev'}/polar/success?checkout_id={CHECKOUT_ID}`,
        metadata: {
          user_id: user.id,
          credits: credits.toString(),
          purchase_type: 'credit_topup',
          // 1 credit = $1 conversion
          amount_usd: credits.toString(),
        },
        // Calculate amount: 1 credit = $1 = 100 cents
        amount: getPolarCreditPrice(credits),
      }),
    })

    if (!polarResponse.ok) {
      const error = await polarResponse.json()
      console.error('Polar checkout creation failed:', error)
      return NextResponse.json({
        error: error.message || 'Failed to create Polar checkout'
      }, { status: polarResponse.status })
    }

    const checkout = await polarResponse.json()

    // Save checkout ID for verification
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        polar_checkout_id: checkout.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    return NextResponse.json({
      checkoutId: checkout.id,
      url: checkout.url,
    })
  } catch (error) {
    console.error('Error creating Polar credit purchase:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

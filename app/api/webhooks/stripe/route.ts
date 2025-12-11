import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { PRODUCT_CONFIGS, EXTRA_CREDITS_PRODUCT } from '@/lib/stripe-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.user_id

        if (!userId) {
          console.error('No user_id in subscription metadata')
          break
        }

        // Get plan from price ID
        const priceId = subscription.items.data[0]?.price.id
        const planId = getPlanFromPriceId(priceId) || 'free'
        const status = subscription.status

        // Get current wallet to calculate credit grant
        const { data: currentWallet } = await supabase
          .from('wallet')
          .select('credits_balance, current_plan')
          .eq('user_id', userId)
          .single()

        const creditsBefore = currentWallet?.credits_balance || 0
        const planConfig = PRODUCT_CONFIGS[planId]
        const monthlyCredits = planConfig?.limits.credits || 20

        // Update wallet with subscription info and grant monthly credits
        const { error } = await supabase
          .from('wallet')
          .upsert({
            user_id: userId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            current_plan: planId,
            subscription_status: mapStripeStatus(status),
            credits_balance: creditsBefore + monthlyCredits, // Grant monthly credits
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          // Log the credit grant transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              amount: monthlyCredits,
              type: 'subscription_grant',
              description: `Monthly credit grant for ${planId} plan`,
              credits_before: creditsBefore,
              credits_after: creditsBefore + monthlyCredits,
              stripe_subscription_id: subscription.id,
              metadata: {
                plan: planId,
                subscription_status: status
              }
            })

          console.log(`Subscription ${subscription.id} ${event.type} for user ${userId}, granted ${monthlyCredits} credits`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.user_id

        if (!userId) {
          console.error('No user_id in subscription metadata')
          break
        }

        // Update wallet to inactive status, keep current credits
        const { error } = await supabase
          .from('wallet')
          .update({
            subscription_status: 'inactive',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Error deleting subscription:', error)
        } else {
          console.log(`Subscription deleted for user ${userId}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string

        if (subscriptionId) {
          // This is a subscription renewal - grant monthly credits
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata.user_id

          if (userId) {
            const planId = getPlanFromPriceId(subscription.items.data[0]?.price.id) || 'free'
            const planConfig = PRODUCT_CONFIGS[planId]
            const monthlyCredits = planConfig?.limits.credits || 20

            // Get current balance
            const { data: wallet } = await supabase
              .from('wallet')
              .select('credits_balance')
              .eq('user_id', userId)
              .single()

            const creditsBefore = wallet?.credits_balance || 0

            // Add monthly credits
            const { error } = await supabase
              .from('wallet')
              .update({
                credits_balance: creditsBefore + monthlyCredits,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)

            if (!error) {
              // Log the renewal credit grant
              await supabase
                .from('transactions')
                .insert({
                  user_id: userId,
                  amount: monthlyCredits,
                  type: 'subscription_grant',
                  description: `Monthly renewal credit grant for ${planId} plan`,
                  credits_before: creditsBefore,
                  credits_after: creditsBefore + monthlyCredits,
                  stripe_subscription_id: subscriptionId,
                  metadata: {
                    invoice_id: invoice.id,
                    plan: planId
                  }
                })

              console.log(`Monthly credits granted for user ${userId}: +${monthlyCredits}`)
            }
          }
        } else {
          // This might be a one-time payment (credit purchase)
          await handleOneTimePayment(invoice, supabase)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string

        if (!subscriptionId) break

        // Get subscription to find user_id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata.user_id

        if (!userId) {
          console.error('No user_id in subscription metadata')
          break
        }

        // Update subscription status to past_due
        const { error } = await supabase
          .from('wallet')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Error updating failed payment:', error)
        } else {
          console.log(`Payment failed for user ${userId}`)
        }
        break
      }

      case 'checkout.session.completed': {
        // Handle one-time credit purchases or marketplace purchases
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'payment' && session.metadata?.user_id) {
          await handleCreditPurchase(session, supabase)
        } else if (session.mode === 'payment' && session.metadata?.purchase_type) {
          // Handle marketplace template/bundle purchases
          await handleMarketplacePurchase(session, supabase)
        }
        break
      }

      case 'charge.succeeded': {
        // Handle marketplace purchases via Stripe Payments (legacy)
        const charge = event.data.object as Stripe.Charge

        if (charge.metadata?.purchase_type === 'template' || charge.metadata?.purchase_type === 'bundle') {
          await handleMarketplaceCharge(charge, supabase, 'sale')
        }
        break
      }

      case 'charge.refunded': {
        // Handle marketplace purchase refunds
        const charge = event.data.object as Stripe.Charge

        if (charge.metadata?.purchase_type === 'template' || charge.metadata?.purchase_type === 'bundle') {
          await handleMarketplaceCharge(charge, supabase, 'refund')
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.user_id

        if (!userId) break

        console.log(`Trial ending soon for user ${userId}`)
        // You could send an email notification here
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Helper function to handle one-time credit purchases
async function handleOneTimePayment(invoice: Stripe.Invoice, supabase: any) {
  // Check if this is a credit purchase by looking at line items
  const lineItem = invoice.lines.data[0]
  if (!lineItem) return

  // Check if it's the extra credits product
  if (lineItem.price?.id === EXTRA_CREDITS_PRODUCT.stripePriceId) {
    const userId = invoice.customer_metadata?.user_id || invoice.metadata?.user_id
    if (!userId) return

    // Calculate credits purchased (price is in cents, 1 credit = $1)
    const amountPaid = invoice.amount_paid / 100 // Convert cents to dollars
    const creditsPurchased = Math.floor(amountPaid) // 1 credit per dollar

    // Get current balance
    const { data: wallet } = await supabase
      .from('wallet')
      .select('credits_balance')
      .eq('user_id', userId)
      .single()

    const creditsBefore = wallet?.credits_balance || 0

    // Add credits to wallet
    const { error } = await supabase
      .from('wallet')
      .update({
        credits_balance: creditsBefore + creditsPurchased,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (!error) {
      // Log the purchase transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: creditsPurchased,
          type: 'purchase',
          description: `Purchased ${creditsPurchased} extra credits`,
          credits_before: creditsBefore,
          credits_after: creditsBefore + creditsPurchased,
          stripe_payment_id: invoice.payment_intent as string,
          metadata: {
            invoice_id: invoice.id,
            amount_paid: invoice.amount_paid
          }
        })

      console.log(`Credits purchased for user ${userId}: +${creditsPurchased}`)
    }
  }
}

// Helper function to handle credit purchases from checkout sessions
async function handleCreditPurchase(session: Stripe.Checkout.Session, supabase: any) {
  const userId = session.metadata?.user_id
  if (!userId) return

  // Get the line items to determine credits purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
  const lineItem = lineItems.data[0]

  if (lineItem?.price?.id === EXTRA_CREDITS_PRODUCT.stripePriceId) {
    const quantity = lineItem.quantity || 1
    const creditsPurchased = quantity // Assuming quantity represents credits

    // Get current balance
    const { data: wallet } = await supabase
      .from('wallet')
      .select('credits_balance')
      .eq('user_id', userId)
      .single()

    const creditsBefore = wallet?.credits_balance || 0

    // Add credits to wallet
    const { error } = await supabase
      .from('wallet')
      .update({
        credits_balance: creditsBefore + creditsPurchased,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (!error) {
      // Log the purchase transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: creditsPurchased,
          type: 'purchase',
          description: `Purchased ${creditsPurchased} extra credits via checkout`,
          credits_before: creditsBefore,
          credits_after: creditsBefore + creditsPurchased,
          stripe_payment_id: session.payment_intent as string,
          metadata: {
            session_id: session.id,
            quantity: quantity
          }
        })

      console.log(`Credits purchased via checkout for user ${userId}: +${creditsPurchased}`)
    }
  }
}

// Helper function to map Stripe price ID to plan ID
function getPlanFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null

  for (const [planId, config] of Object.entries(PRODUCT_CONFIGS)) {
    if (config.prices.monthly.stripePriceId === priceId || config.prices.yearly.stripePriceId === priceId) {
      return planId
    }
  }
  return null
}

// Helper function to map Stripe status to our database enum
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'active', // Treat trialing as active for credits
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'inactive',
    'incomplete': 'inactive',
    'incomplete_expired': 'inactive'
  }

  return statusMap[stripeStatus] || 'inactive'
}

// Helper function to handle marketplace checkout sessions
async function handleMarketplacePurchase(session: Stripe.Checkout.Session, supabase: any) {
  const buyerId = session.metadata?.buyer_id
  const creatorId = session.metadata?.creator_id
  const templateIds = session.metadata?.template_ids?.split(',') || []
  const bundleId = session.metadata?.bundle_id
  const platformFee = parseFloat(session.metadata?.platform_fee || '0')
  const creatorEarnings = parseFloat(session.metadata?.creator_earnings || '0')

  if (!buyerId || !creatorId) return

  // Update purchase status to completed
  const { error: updateError } = await supabase
    .from('template_purchases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', session.payment_intent as string)

  if (updateError) {
    console.error('Failed to update marketplace purchase:', updateError)
    return
  }

  // Update creator marketplace wallet
  const { data: wallet, error: walletError } = await supabase
    .from('marketplace_wallet')
    .select('*')
    .eq('creator_id', creatorId)
    .single()

  if (walletError || !wallet) {
    console.error('Failed to fetch creator marketplace wallet:', walletError)
    return
  }

  // Update wallet balance
  const newAvailableBalance = (wallet.available_balance || 0) + creatorEarnings
  const newTotalEarned = (wallet.total_earned || 0) + creatorEarnings

  await supabase
    .from('marketplace_wallet')
    .update({
      available_balance: newAvailableBalance,
      total_earned: newTotalEarned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)

  // Record transaction
  await supabase
    .from('marketplace_transactions')
    .insert({
      wallet_id: wallet.id,
      transaction_type: 'sale',
      amount: creatorEarnings,
      reference_id: session.payment_intent,
      description: bundleId ? 'Bundle sale' : 'Template sale',
      created_at: new Date().toISOString(),
    })

  // Update creator profile earnings
  await supabase
    .from('profiles')
    .update({
      total_earnings: newTotalEarned,
    })
    .eq('id', creatorId)

  // Update template metadata stats
  if (templateIds.length > 0) {
    for (const templateId of templateIds) {
      const { data: metadata } = await supabase
        .from('template_metadata')
        .select('*')
        .eq('template_id', templateId)
        .single()

      if (metadata) {
        await supabase
          .from('template_metadata')
          .update({
            total_sales: (metadata.total_sales || 0) + 1,
            total_revenue: (metadata.total_revenue || 0) + creatorEarnings / templateIds.length,
            total_downloads: (metadata.total_downloads || 0) + 1,
          })
          .eq('template_id', templateId)
      }
    }
  }

  console.log(`✅ Marketplace purchase completed: ${buyerId} → ${creatorId}, earnings: $${creatorEarnings}`)
}

// Helper function to handle marketplace charges (legacy Stripe Payments API)
async function handleMarketplaceCharge(charge: Stripe.Charge, supabase: any, type: 'sale' | 'refund') {
  const buyerId = charge.metadata?.buyer_id
  const creatorId = charge.metadata?.creator_id
  const templateIds = charge.metadata?.template_ids?.split(',') || []
  const bundleId = charge.metadata?.bundle_id
  const creatorEarnings = parseFloat(charge.metadata?.creator_earnings || '0')

  if (!buyerId || !creatorId) return

  // Update purchase status
  const status = type === 'sale' ? 'completed' : 'refunded'
  await supabase
    .from('template_purchases')
    .update({
      status,
      [type === 'sale' ? 'completed_at' : 'refunded_at']: new Date().toISOString(),
    })
    .eq('payment_intent_id', charge.payment_intent as string)

  // Update marketplace wallet
  const { data: wallet } = await supabase
    .from('marketplace_wallet')
    .select('*')
    .eq('creator_id', creatorId)
    .single()

  if (!wallet) return

  const walletAdjustment = type === 'sale' ? creatorEarnings : -creatorEarnings
  const newAvailableBalance = (wallet.available_balance || 0) + walletAdjustment
  const newTotalEarned = (wallet.total_earned || 0) + walletAdjustment

  await supabase
    .from('marketplace_wallet')
    .update({
      available_balance: Math.max(0, newAvailableBalance),
      total_earned: Math.max(0, newTotalEarned),
    })
    .eq('id', wallet.id)

  // Record transaction
  await supabase
    .from('marketplace_transactions')
    .insert({
      wallet_id: wallet.id,
      transaction_type: type,
      amount: walletAdjustment,
      reference_id: charge.id,
      description: type === 'sale' ? 'Sale' : 'Refund',
      created_at: new Date().toISOString(),
    })

  console.log(`${type === 'sale' ? '✅' : '⚠️'} Marketplace ${type}: ${creatorId}, amount: $${Math.abs(walletAdjustment)}`)
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import Stripe from "stripe"

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe as Stripe
}

// Helper function to verify webhook signature
async function verifyWebhookSignature(body: string, signature: string, secret: string) {
  const stripeInstance = getStripe()
  try {
    return stripeInstance.webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

// Helper function to log webhook events
async function logWebhookEvent(eventType: string, eventId: string, status: 'success' | 'failed', error?: string, userId?: string) {
  const supabase = await createClient()

  try {
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: eventType,
        event_id: eventId,
        user_id: userId,
        status,
        error,
        processed_at: new Date().toISOString()
      })
  } catch (logError) {
    console.error('Failed to log webhook event:', logError)
  }
}

// Helper function to check for recent updates (prevent duplicate updates)
async function shouldUpdateSubscription(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient()

  try {
    // Check if this webhook event was already processed recently
    const { data: recentLog } = await supabase
      .from('webhook_logs')
      .select('processed_at')
      .eq('event_id', eventId)
      .eq('status', 'success')
      .order('processed_at', { ascending: false })
      .limit(1)
      .single()

    if (recentLog) {
      const processedTime = new Date(recentLog.processed_at).getTime()
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000 // 5 minutes window

      if (now - processedTime < fiveMinutes) {
        console.log(`⏭️ Skipping duplicate webhook event ${eventId} for user ${userId}`)
        return false
      }
    }

    // Check if subscription was updated very recently (prevent rapid updates)
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', userId)
      .single()

    if (userSettings?.updated_at) {
      const lastUpdate = new Date(userSettings.updated_at).getTime()
      const now = Date.now()
      const thirtySeconds = 30 * 1000 // 30 seconds window

      if (now - lastUpdate < thirtySeconds) {
        console.log(`⏭️ Skipping rapid update for user ${userId} (last update: ${userSettings.updated_at})`)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error checking for recent updates:', error)
    return true // Allow update if check fails
  }
}

// Helper function to update user subscription
async function updateUserSubscription(userId: string, subscriptionData: Stripe.Subscription, eventId: string) {
  const supabase = await createClient()

  // Check if we should update (prevent duplicates)
  const shouldUpdate = await shouldUpdateSubscription(userId, eventId)
  if (!shouldUpdate) {
    await logWebhookEvent('subscription_update', eventId, 'success', undefined, userId)
    return // Skip update
  }

  const updateData = {
    user_id: userId,
    stripe_customer_id: subscriptionData.customer as string,
    stripe_subscription_id: subscriptionData.id,
    subscription_plan: subscriptionData.metadata?.plan_type || 'pro',
    subscription_status: subscriptionData.status === 'active' ? 'active' :
                        subscriptionData.status === 'canceled' ? 'canceled' :
                        subscriptionData.status === 'past_due' ? 'past_due' :
                        subscriptionData.status === 'trialing' ? 'trialing' : 'inactive',
    last_payment_date: new Date().toISOString(),
    cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
    // Reset usage counters on new billing cycle
    deployments_this_month: 0,
    github_pushes_this_month: 0,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert(updateData, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Error updating user subscription:', error)
    await logWebhookEvent('subscription_update', eventId, 'failed', error.message, userId)
    throw error
  }

  console.log(`✅ Updated subscription for user ${userId}: ${subscriptionData.status}`)
  await logWebhookEvent('subscription_update', eventId, 'success', undefined, userId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = (await headers()).get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature provided')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature, webhookSecret)
    console.log(`🎣 Webhook received: ${event.type}`)

    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Checkout session completed:', session.id)

        try {
          // Get user ID from session metadata
          const userId = session.metadata?.user_id
          if (!userId) {
            console.error('No user_id in session metadata')
            await logWebhookEvent(event.type, event.id, 'failed', 'Missing user ID')
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
          }

          // Retrieve the subscription from Stripe
          if (session.subscription) {
            const stripeInstance = getStripe()
            const subscription = await stripeInstance.subscriptions.retrieve(session.subscription as string)

            // Update user subscription in database with duplicate prevention
            await updateUserSubscription(userId, subscription, event.id)
          }

          await logWebhookEvent(event.type, event.id, 'success', undefined, userId)
        } catch (error) {
          console.error('Error processing checkout.session.completed:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object
        console.log('Subscription created:', subscription.id)

        try {
          // Find user by customer ID
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()

          if (userSettings?.user_id) {
            await updateUserSubscription(userSettings.user_id, subscription, event.id)
          } else {
            console.error('User not found for customer:', subscription.customer)
            await logWebhookEvent(event.type, event.id, 'failed', 'User not found')
          }
        } catch (error) {
          console.error('Error processing customer.subscription.created:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        console.log('Subscription updated:', subscription.id)

        try {
          // Find user by customer ID
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()

          if (userSettings?.user_id) {
            await updateUserSubscription(userSettings.user_id, subscription, event.id)
          } else {
            console.error('User not found for customer:', subscription.customer)
            await logWebhookEvent(event.type, event.id, 'failed', 'User not found')
          }
        } catch (error) {
          console.error('Error processing customer.subscription.updated:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('Subscription deleted:', subscription.id)

        try {
          // Find user by customer ID and mark as free
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()

          if (userSettings?.user_id) {
            const { error } = await supabase
              .from('user_settings')
              .update({
                subscription_plan: 'free',
                subscription_status: 'inactive',
                stripe_subscription_id: null,
                cancel_at_period_end: false,
                deployments_this_month: 0,
                github_pushes_this_month: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userSettings.user_id)

            if (error) {
              console.error('Error marking subscription as deleted:', error)
              await logWebhookEvent(event.type, event.id, 'failed', error.message, userSettings.user_id)
            } else {
              console.log(`✅ Marked subscription as deleted for user ${userSettings.user_id}`)
              await logWebhookEvent(event.type, event.id, 'success', undefined, userSettings.user_id)
            }
          }
        } catch (error) {
          console.error('Error processing customer.subscription.deleted:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log('Payment succeeded for invoice:', invoice.id)

        try {
          // Find user by customer ID and update last payment date
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('stripe_customer_id', invoice.customer)
            .single()

          if (userSettings?.user_id) {
            // Check for recent payment updates to prevent duplicates
            const { data: recentPayment } = await supabase
              .from('user_settings')
              .select('last_payment_date')
              .eq('user_id', userSettings.user_id)
              .single()

            const shouldUpdatePayment = !recentPayment?.last_payment_date ||
              new Date(recentPayment.last_payment_date).getTime() < Date.now() - (60 * 1000) // 1 minute ago

            if (shouldUpdatePayment) {
              // Reset usage counters on successful payment
              const { error } = await supabase
                .from('user_settings')
                .update({
                  last_payment_date: new Date().toISOString(),
                  deployments_this_month: 0,
                  github_pushes_this_month: 0,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userSettings.user_id)

              if (error) {
                console.error('Error updating payment date:', error)
                await logWebhookEvent(event.type, event.id, 'failed', error.message, userSettings.user_id)
              } else {
                console.log(`✅ Reset usage counters for user ${userSettings.user_id} after successful payment`)
                await logWebhookEvent(event.type, event.id, 'success', undefined, userSettings.user_id)
              }
            } else {
              console.log(`⏭️ Skipping duplicate payment update for user ${userSettings.user_id}`)
              await logWebhookEvent(event.type, event.id, 'success', 'Duplicate prevented', userSettings.user_id)
            }
          }
        } catch (error) {
          console.error('Error processing invoice.payment_succeeded:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('Payment failed for invoice:', invoice.id)

        try {
          // Find user by customer ID and mark subscription as past_due
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('stripe_customer_id', invoice.customer)
            .single()

          if (userSettings?.user_id) {
            const { error } = await supabase
              .from('user_settings')
              .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userSettings.user_id)

            if (error) {
              console.error('Error updating subscription status to past_due:', error)
              await logWebhookEvent(event.type, event.id, 'failed', error.message, userSettings.user_id)
            } else {
              console.log(`⚠️ Marked subscription as past_due for user ${userSettings.user_id}`)
              await logWebhookEvent(event.type, event.id, 'success', undefined, userSettings.user_id)
            }
          }
        } catch (error) {
          console.error('Error processing invoice.payment_failed:', error)
          await logWebhookEvent(event.type, event.id, 'failed', error instanceof Error ? error.message : 'Unknown error')
        }

        break
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`)
        await logWebhookEvent(event.type, event.id, 'success', 'Unhandled event type')
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

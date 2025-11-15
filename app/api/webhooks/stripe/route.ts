import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'

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

        const planId = subscription.metadata.plan_id || 'pro'
        const status = subscription.status

        // Update user settings
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            subscription_status: mapStripeStatus(status),
            subscription_plan: planId,
            subscription_start_date: new Date((subscription as any).current_period_start * 1000).toISOString(),
            subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log(`Subscription ${subscription.id} ${event.type} for user ${userId}`)
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

        // Revert to free plan
        const { error } = await supabase
          .from('user_settings')
          .update({
            subscription_status: 'inactive',
            subscription_plan: 'free',
            stripe_subscription_id: null,
            subscription_end_date: new Date().toISOString(),
            cancel_at_period_end: false,
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
        
        if (!subscriptionId) break

        // Get subscription to find user_id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata.user_id

        if (!userId) {
          console.error('No user_id in subscription metadata')
          break
        }

        // Update last payment date
        const { error } = await supabase
          .from('user_settings')
          .update({
            last_payment_date: new Date(invoice.created * 1000).toISOString(),
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Error updating payment date:', error)
        } else {
          console.log(`Payment succeeded for user ${userId}`)
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
          .from('user_settings')
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

// Helper function to map Stripe status to our database enum
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'inactive',
    'incomplete': 'inactive',
    'incomplete_expired': 'inactive'
  }
  
  return statusMap[stripeStatus] || 'inactive'
}

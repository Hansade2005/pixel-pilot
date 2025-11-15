# Stripe Payment Integration Setup Guide

## Overview
This guide will help you set up Stripe payment integration for PiPilot's subscription system. The integration includes checkout sessions, webhook handlers, and customer portal access.

## Prerequisites
- Stripe account (create one at https://stripe.com)
- Access to Stripe Dashboard
- Supabase database with `user_settings` table
- Next.js application running locally or deployed

## Architecture

### Flow Diagram
```
User clicks "Subscribe" → Create Checkout Session API 
                       ↓
                Stripe Checkout Page
                       ↓
              Payment Success/Failure
                       ↓
                 Stripe Webhook
                       ↓
            Update Database (user_settings)
                       ↓
              Redirect to Success Page
```

### Components Created
1. **Webhook Handler** (`app/api/webhooks/stripe/route.ts`)
   - Handles subscription lifecycle events
   - Updates database on payment success/failure
   - Manages subscription status changes

2. **Portal Session API** (`app/api/stripe/create-portal-session/route.ts`)
   - Creates Stripe Customer Portal sessions
   - Allows users to manage subscriptions
   - Handles billing information updates

3. **Checkout Session API** (`app/api/stripe/create-checkout-session/route.ts`) [Already existed]
   - Creates Stripe checkout sessions
   - Handles customer creation
   - Redirects to success/cancel pages

4. **Verify Session API** (`app/api/stripe/verify-session/route.ts`) [Already existed]
   - Verifies payment completion
   - Updates subscription status
   - Handles post-payment logic

## Step 1: Stripe Account Setup

### 1.1 Create Stripe Products
1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Create two products:

**Pro Monthly Plan**
- Name: "PiPilot Pro - Monthly"
- Description: "10 deployments/month, unlimited prompts, Vercel + Netlify"
- Pricing: $29 USD / month
- Billing period: Monthly recurring
- Copy the **Price ID** (starts with `price_`)

**Pro Yearly Plan**
- Name: "PiPilot Pro - Annual"
- Description: "10 deployments/month, unlimited prompts, Vercel + Netlify (Save 20%)"
- Pricing: $279 USD / year
- Billing period: Yearly recurring
- Copy the **Price ID** (starts with `price_`)

### 1.2 Get API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Keep this secure - never commit to git

### 1.3 Set Up Webhook Endpoint

#### For Local Development (using Stripe CLI)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhook events to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`)

#### For Production
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 1.4 Enable Customer Portal
1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Click "Activate test link" or "Activate"
3. Configure settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing information
   - ✅ Allow customers to cancel subscriptions
   - Set cancellation behavior (immediate or end of period)
4. Save changes

## Step 2: Environment Variables

### 2.1 Add to `.env.local`
```bash
# Stripe Payment Integration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.2 Add to Vercel/Netlify Environment Variables
If deploying to production, add the same variables to your hosting platform's environment variable settings.

**For Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable with production values
3. Redeploy

**For Netlify:**
1. Go to Site Settings → Build & Deploy → Environment
2. Add each variable with production values
3. Trigger rebuild

## Step 3: Database Verification

### 3.1 Verify Supabase Table Schema
The `user_settings` table should have these columns:
- `user_id` (uuid, primary key)
- `stripe_customer_id` (text, nullable)
- `stripe_subscription_id` (text, nullable)
- `stripe_secret_key` (text, nullable)
- `subscription_status` (text: active/inactive/canceled/past_due/trialing)
- `subscription_plan` (text: free/pro/teams/enterprise)
- `subscription_start_date` (timestamptz, nullable)
- `subscription_end_date` (timestamptz, nullable)
- `last_payment_date` (timestamptz, nullable)
- `cancel_at_period_end` (boolean, default false)
- `deployments_this_month` (integer, default 0)
- `github_pushes_this_month` (integer, default 0)
- `credits_remaining` (numeric, nullable)
- `credits_used_this_month` (numeric, default 0)

### 3.2 Test Database Connection
Run this SQL in Supabase SQL Editor:
```sql
SELECT user_id, stripe_customer_id, subscription_plan, subscription_status 
FROM user_settings 
LIMIT 5;
```

## Step 4: Testing the Integration

### 4.1 Local Testing with Stripe CLI
1. Start your dev server:
   ```bash
   npm run dev
   ```
2. In another terminal, start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date, any CVC, any ZIP

### 4.2 Test Checkout Flow
1. Navigate to `/pricing`
2. Click "Select plan" on Pro Monthly or Pro Yearly
3. Complete checkout with test card `4242 4242 4242 4242`
4. Verify redirect to success page
5. Check Stripe CLI output for webhook events
6. Verify database updated:
   ```sql
   SELECT * FROM user_settings WHERE user_id = 'your_user_id';
   ```

### 4.3 Test Customer Portal
1. Navigate to `/workspace/account` or `/pc-workspace/account`
2. Find "Manage Subscription" button (only visible if subscribed)
3. Click to open Stripe Customer Portal
4. Test updating payment method
5. Test canceling subscription
6. Verify webhook events received

### 4.4 Test Webhook Events
Manually trigger events using Stripe CLI:
```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test subscription created
stripe trigger customer.subscription.created

# Test subscription canceled
stripe trigger customer.subscription.deleted
```

## Step 5: Production Deployment

### 5.1 Switch to Live Mode
1. In Stripe Dashboard, toggle from Test to Live mode
2. Create live products with same details as test
3. Copy live price IDs
4. Copy live secret key
5. Create live webhook endpoint
6. Update production environment variables

### 5.2 Verify Production Webhook
1. Make a small test payment in live mode
2. Check webhook delivery in Stripe Dashboard
3. Verify database updated correctly
4. Test customer portal in live mode

### 5.3 Monitor in Production
- Stripe Dashboard → Payments (monitor transactions)
- Stripe Dashboard → Webhooks (check delivery success rate)
- Supabase Dashboard → Table Editor → user_settings (verify updates)
- Application logs (check for errors)

## Step 6: Common Issues & Solutions

### Issue: Webhook signature verification failed
**Solution:** 
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check that raw body is passed to webhook verification
- Verify webhook endpoint URL matches exactly

### Issue: Payment succeeds but database not updated
**Solution:**
- Check webhook is being received (Stripe Dashboard)
- Verify webhook events include required events
- Check application logs for errors
- Ensure `user_id` is in session metadata

### Issue: Customer portal link doesn't work
**Solution:**
- Verify customer portal is activated in Stripe Dashboard
- Check `stripe_customer_id` exists in database
- Ensure portal session API is working
- Verify redirect URL is correct

### Issue: Checkout session creation fails
**Solution:**
- Verify price IDs are correct
- Check Stripe secret key is valid
- Ensure user is authenticated
- Verify app URL is set correctly

## Step 7: Security Best Practices

### 7.1 Environment Variables
- Never commit `.env.local` to git
- Use different keys for test/production
- Rotate keys periodically
- Use Vercel/Netlify environment variables for production

### 7.2 Webhook Security
- Always verify webhook signatures
- Use HTTPS in production
- Log webhook events for audit trail
- Handle idempotency (webhook retries)

### 7.3 Database Security
- Enable Row Level Security (RLS) on user_settings table
- Only allow users to read their own data
- Use service role for webhook updates
- Validate user_id matches authenticated user

## Step 8: Monitoring & Analytics

### 8.1 Stripe Dashboard Metrics
- Monitor Monthly Recurring Revenue (MRR)
- Track churn rate
- Analyze failed payments
- Review subscription lifecycle

### 8.2 Application Metrics
- Track conversion rate (free → pro)
- Monitor checkout abandonment
- Analyze upgrade/downgrade patterns
- Review customer portal usage

### 8.3 Error Tracking
- Set up Sentry or similar for error tracking
- Monitor webhook delivery failures
- Track API endpoint errors
- Set up alerts for critical failures

## API Endpoints Reference

### POST `/api/stripe/create-checkout-session`
Creates a Stripe checkout session for subscription purchase.

**Request Body:**
```json
{
  "planType": "pro",
  "isAnnual": false
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_xxx"
}
```

### POST `/api/stripe/create-portal-session`
Creates a Stripe Customer Portal session for subscription management.

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/xxx"
}
```

### POST `/api/stripe/verify-session`
Verifies a completed checkout session and updates database.

**Request Body:**
```json
{
  "sessionId": "cs_test_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "plan": "pro"
}
```

### POST `/api/webhooks/stripe`
Handles Stripe webhook events (internal endpoint).

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## Support & Resources

### Stripe Documentation
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Customer Portal: https://stripe.com/docs/billing/subscriptions/customer-portal
- Testing: https://stripe.com/docs/testing

### Supabase Documentation
- Database: https://supabase.com/docs/guides/database
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- API: https://supabase.com/docs/reference/javascript

### Need Help?
- Check webhook logs in Stripe Dashboard
- Review application server logs
- Test with Stripe CLI
- Contact support@pipilot.dev (or your support email)

---

**Setup Status Checklist:**
- [ ] Created Stripe products (Pro Monthly/Yearly)
- [ ] Copied price IDs
- [ ] Got API secret key
- [ ] Set up webhook endpoint
- [ ] Got webhook signing secret
- [ ] Enabled Customer Portal
- [ ] Added environment variables
- [ ] Tested checkout flow
- [ ] Verified webhook delivery
- [ ] Tested customer portal
- [ ] Deployed to production
- [ ] Switched to live mode
- [ ] Tested live payment

---

**Last Updated:** January 2025
**Stripe API Version:** 2024-11-20.acacia

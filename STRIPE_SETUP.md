# Stripe Integration Setup Guide

## Environment Variables Required

Add these environment variables to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51MiyfiIgnyjJWA40UIlAv7c1KShr87YpPFwXNpEz3jkY2nFKxnfO3Tqj4iWOtX273kuU32RdHXwmUkaN8KZ5nZYz003NuUhqRs
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in your Stripe dashboard)
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_pro_id
NEXT_PUBLIC_STRIPE_PRICE_TEAMS=price_teams_id
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_enterprise_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Stripe Dashboard Setup

### 1. Create Products and Prices

Go to your [Stripe Dashboard](https://dashboard.stripe.com/) and create the following:

#### Pro Plan ($15/month)
- **Product Name**: Pixel Pilot Pro
- **Price**: $15.00 USD per month
- **Billing**: Monthly subscription
- **Copy Price ID** and set as `NEXT_PUBLIC_STRIPE_PRICE_PRO`

#### Teams Plan ($30/month)
- **Product Name**: Pixel Pilot Teams
- **Price**: $30.00 USD per month
- **Billing**: Monthly subscription
- **Copy Price ID** and set as `NEXT_PUBLIC_STRIPE_PRICE_TEAMS`

#### Enterprise Plan ($60/month)
- **Product Name**: Pixel Pilot Enterprise
- **Price**: $60.00 USD per month
- **Billing**: Monthly subscription
- **Copy Price ID** and set as `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE`

### 2. Set up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
4. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the webhook signing secret** and set as `STRIPE_WEBHOOK_SECRET`

## Database Setup

Run the updated setup script to add subscription tracking to your database:

```sql
-- This is already included in supabase/setup.sql
-- Run this in your Supabase SQL editor or migration
```

## Testing the Integration

1. **Start your development server**
2. **Visit `/pricing` page**
3. **Click on Pro/Teams plan** (you'll be redirected to Stripe checkout)
4. **Complete payment** (use test card numbers in test mode)
5. **Verify subscription** is updated in your database

## Flow Summary

### Without Webhooks (Current Implementation)
1. **Admin → Create Product/Price** ✅ Done in Stripe dashboard
2. **Frontend → User selects plan** ✅ Updated pricing page
3. **Backend → Create Checkout Session** ✅ `/api/stripe/create-checkout-session`
4. **Stripe → Redirect to success_url** ✅ Handled in pricing page
5. **Backend → Retrieve session** ✅ Webhook handles this

### With Webhooks (Recommended for Production)
- Webhook endpoint handles real-time subscription updates
- Automatic credit resets on billing cycles
- Failed payment handling

## Security Notes

- **Webhook Secret**: Keep `STRIPE_WEBHOOK_SECRET` secure
- **Environment Variables**: Never commit real API keys to version control
- **Rate Limiting**: Consider adding rate limiting to webhook endpoint
- **Error Handling**: Webhook failures are logged but don't break the user experience

## Troubleshooting

### Common Issues:

1. **Webhook signature verification fails**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure webhook endpoint is accessible

2. **Checkout session creation fails**
   - Verify `STRIPE_SECRET_KEY` is correct
   - Check price IDs exist in Stripe dashboard

3. **Subscription not updating**
   - Check webhook endpoint is receiving events
   - Verify database connection and permissions

### Debug Mode:

Set `NODE_ENV=development` to see detailed error logs.

## Next Steps

1. ✅ **Stripe configuration** - Complete
2. ✅ **Database schema** - Complete
3. ✅ **API endpoints** - Complete
4. ✅ **Frontend integration** - Complete
5. 🔄 **Create Stripe products** - Manual step required
6. 🔄 **Test integration** - Manual testing required
7. 🔄 **Set up webhooks** - Manual step required

---

**Last Updated**: December 2024
**Status**: Ready for production with manual Stripe setup


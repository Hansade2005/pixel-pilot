# AI Build Ecosystem (ABE) - Complete Implementation Plan

## Overview
This document outlines the complete pricing, credit, and wallet system for the AI Build Ecosystem (ABE). The system uses a credit-based model where users pay $1 per credit, with 0.25 credits deducted per AI message request.

## Pricing Tiers

### Free Plan
- **Price**: $0/month
- **Credits**: 20/month (80 messages)
- **Features**:
  - Basic AI chat & code generation
  - Deploy to Vercel
  - Visual editing with Design Mode
  - GitHub sync
  - 7 message/day limit
  - 1 app/project
  - Public/open-source unlimited
- **Restrictions**: No credit purchases, upgrade required when exhausted
- **Stripe Product ID**: `prod_TWBUUaESS42Lhe`
- **Stripe Price ID**: `price_1SZ9843G7U0M1bp1WcX6j6b1`

### Creator Plan
- **Price**: $15/month
- **Credits**: 50/month (200 messages)
- **Features**:
  - All Free features
  - $5 of included monthly credits
  - 5x higher attachment size limits
  - Import from Figma
  - Custom domains
  - Remove Lovable badge
  - 10% revenue share on monetized apps
  - Unlimited credit purchases
- **Stripe Product ID**: `prod_TWBVaEqAk1898D`
- **Stripe Price ID**: `price_1SZ98W3G7U0M1bp1u30VJE2V`

### Collaborate Plan
- **Price**: $25/month (shared across unlimited users)
- **Credits**: 75/month (300 messages, shared pool)
- **Features**:
  - All Creator features
  - Centralized billing on Vercel
  - Share chats and collaborate
  - User roles & permissions
  - 15% revenue share
  - Unlimited credit purchases (shared pool)
- **Stripe Product ID**: `prod_TWBVEKvyCu0hYP`
- **Stripe Price ID**: `price_1SZ98n3G7U0M1bp1DipaxRvq`

### Scale Plan
- **Price**: $60/month (shared across unlimited users)
- **Credits**: 150/month (600 messages, shared pool)
- **Features**:
  - All Collaborate features
  - Internal publish
  - SSO
  - Personal projects
  - Opt out of data training
  - Design templates
  - 20% revenue share
  - Unlimited credit purchases (shared pool)
- **Stripe Product ID**: `prod_TWBVHmYvmfFQMA`
- **Stripe Price ID**: `price_1SZ98v3G7U0M1bp1YAD89Tx4`

### Extra Credits
- **Price**: $1 per credit (one-time purchase)
- **Availability**: Paid plans only
- **Stripe Product ID**: `prod_TWBWlx7GadNZK1`
- **Stripe Price ID**: `price_1SZ9923G7U0M1bp18UU5eKQ8`

## Credit System

### Core Mechanics
- **Cost per Request**: 0.25 credits per AI message
- **Credit Value**: $1 = 1 credit
- **Free Tier Cap**: 20 credits (no purchases allowed)
- **Paid Plans**: Unlimited purchases + monthly grants

### Usage Tracking
- Credits deducted on each AI request
- Monthly usage limits enforced
- Automatic monthly resets
- Transaction history maintained

## Database Schema

### wallet Table
```sql
CREATE TABLE wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  credits_balance integer NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  credits_used_this_month integer NOT NULL DEFAULT 0,
  credits_used_total integer NOT NULL DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS Policy
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON wallet
  FOR ALL USING (auth.uid() = user_id);
```

### usage_logs Table
```sql
CREATE TABLE usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  model text NOT NULL,
  credits_used numeric(4,2) NOT NULL,
  request_type text NOT NULL,
  tokens_used integer,
  response_time_ms integer,
  status text DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS Policy
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);
```

### transactions Table
```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription_grant', 'purchase', 'usage', 'bonus', 'refund', 'adjustment')),
  description text NOT NULL,
  credits_before integer NOT NULL,
  credits_after integer NOT NULL,
  stripe_payment_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS Policy
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
```

## Implementation Steps

### Phase 1: Database Setup
1. Create wallet, usage_logs, and transactions tables
2. Set up RLS policies
3. Create indexes for performance
4. Migrate existing user_settings credit data

### Phase 2: Credit Management Logic
1. Create credit-manager.ts utility
2. Implement deductCredits() function
3. Add credit validation middleware
4. Update AI providers to use credit system

### Phase 3: Stripe Integration
1. Set up webhook handlers for subscriptions
2. Implement credit purchase flow
3. Add subscription management
4. Handle failed payments and cancellations

### Phase 4: User Interface
1. Update pricing page with new tiers
2. Add credit dashboard/balance display
3. Implement purchase flows
4. Add usage analytics

### Phase 5: Monthly Reset System
1. Create Edge Function for monthly resets
2. Set up cron job or scheduled function
3. Handle subscription renewals
4. Send renewal notifications

## API Endpoints

### Credit Management
- `POST /api/credits/deduct` - Deduct credits for usage
- `GET /api/credits/balance` - Get current balance
- `POST /api/credits/purchase` - Purchase extra credits
- `GET /api/credits/transactions` - Get transaction history

### Subscription Management
- `POST /api/stripe/create-checkout-session` - Start subscription
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/subscription/status` - Get subscription details

## Webhook Handling

### Subscription Events
- `customer.subscription.created` → Grant initial credits
- `customer.subscription.updated` → Handle plan changes
- `customer.subscription.deleted` → Stop credit grants
- `invoice.payment_succeeded` → Grant monthly credits

### Payment Events
- `checkout.session.completed` → Process one-time purchases
- `payment_intent.succeeded` → Confirm credit purchases

## Migration Strategy

### Data Migration
1. Export existing user_settings credit data
2. Create wallet records for all users
3. Migrate transaction history (if any)
4. Update user_settings to reference wallet

### Code Migration
1. Update credit checking logic
2. Replace balance queries with wallet queries
3. Update subscription handlers
4. Test all flows thoroughly

## User Experience Flows

### New User Flow
1. Sign up → Free plan activated → 20 credits granted
2. Use features → Credits deducted automatically
3. Credits low → Upgrade prompt shown
4. Subscribe → Monthly credits granted

### Existing User Flow
1. Login → Credits loaded from wallet
2. Continue usage → Seamless experience
3. Plan expires → Graceful downgrade
4. Resubscribe → Credits restored

## Monitoring & Analytics

### Key Metrics
- Credit consumption by plan
- Conversion rates (free to paid)
- Monthly recurring revenue (MRR)
- Churn rates by plan
- Credit purchase frequency

### Alerts
- Low credit warnings
- Failed payment notifications
- Unusual usage patterns
- Subscription cancellations

## Security Considerations

### RLS Policies
- Users can only access their own wallet data
- API keys properly secured
- Transaction logs immutable

### Rate Limiting
- API request limits by plan
- Credit purchase limits
- Failed payment retry limits

## Testing Strategy

### Unit Tests
- Credit deduction logic
- Balance validation
- Transaction recording

### Integration Tests
- Stripe webhook handling
- Subscription flows
- Credit purchase flows

### E2E Tests
- Complete user journeys
- Plan upgrades/downgrades
- Payment failures

## Rollback Plan

### Database Rollback
- Keep old user_settings table
- Create migration rollback scripts
- Data backup before migration

### Feature Flags
- Gradual rollout with feature flags
- A/B testing for new flows
- Easy disable if issues arise

## Success Metrics

### Business Metrics
- Monthly active users by plan
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)
- Churn reduction

### Technical Metrics
- API response times
- Webhook processing success rate
- Database query performance
- Error rates

## Timeline

### Week 1: Foundation
- Database schema creation
- Basic credit management logic
- Stripe product setup

### Week 2: Core Features
- Credit deduction system
- Subscription webhooks
- Basic UI updates

### Week 3: Advanced Features
- Team/shared wallets
- Monthly reset system
- Analytics dashboard

### Week 4: Testing & Launch
- Full testing suite
- User acceptance testing
- Production deployment

## Risk Mitigation

### Technical Risks
- Database migration failures → Comprehensive backups
- Stripe webhook failures → Retry logic and monitoring
- Credit calculation errors → Validation and audit logs

### Business Risks
- User confusion → Clear communication and support
- Payment failures → Grace periods and notifications
- Churn increase → Retention campaigns and feedback loops

## Support & Documentation

### User Documentation
- Credit system explanation
- Plan comparison guide
- Billing FAQ
- Troubleshooting guides

### Developer Documentation
- API reference
- Webhook specifications
- Database schema docs
- Deployment guides

This comprehensive plan ensures a smooth transition to the credit-based system while maintaining user trust and system reliability.
# Monetizable Template Marketplace - Implementation Plan

## Executive Summary

Transform PiPilot's community templates into a **full marketplace** where:
- **Creators** sell premium templates and earn recurring revenue
- **Users** discover curated "vibe packs" (themed bundles) and purchase templates
- **PiPilot** takes a commission (suggested 20-30%) on all sales
- **Analytics** provide real-time performance metrics for both creators and admins

---

## Current State Analysis

### Existing Database
**public_templates table** (6 rows currently):
- `id` (uuid)
- `user_id` (uuid) - creator ID
- `name` (text)
- `description` (text)
- `thumbnail_url` (text)
- `files` (jsonb)
- `author_name` (text)
- `usage_count` (int) - basic metric
- `preview_url` (text)

### Existing UI
**templates-view.tsx**:
- Displays all templates in grid
- Edit/delete buttons for template owner
- Uses Lucide icons (Edit3, Trash2)
- Responsive mobile design
- No pricing, purchase, or monetization features

### Existing Systems (Keep Separate!)
✅ `wallet` table - **AI API credits system** (not for marketplace)
✅ `transactions` table - AI usage transaction history
✅ `ai_wallets` table - AI platform wallet system
⚠️ **IMPORTANT:** Create separate marketplace wallet system to avoid conflicts

---

## Phase 1: Database Schema Extensions

### Important: Separate Wallet Systems

**Two Independent Wallet Systems:**

1. **AI Wallet** (`ai_wallets` table) - For paying for AI API usage
   - Tracks credits users purchase for LLM API calls
   - Deducts from credits when using AI features
   - User purchases credits to use AI services

2. **Marketplace Wallet** (`marketplace_wallet` table) - NEW
   - Only for **creators** who sell templates
   - Tracks earned revenue from template sales
   - Manages payouts to creator bank accounts
   - Tracks pending vs available balance

**Why Separate?**
- Different users (template buyers ≠ template sellers)
- Different transaction types (usage ≠ earnings)
- Different payout mechanisms (credits vs bank transfer)
- Cleaner accounting and reporting

---

### New Marketplace-Specific Tables

#### 1. **marketplace_wallet** (Creator earnings account)
```sql
CREATE TABLE marketplace_wallet (
  id UUID,
  creator_id UUID UNIQUE, -- Only creators have this
  available_balance NUMERIC, -- Ready to withdraw
  pending_balance NUMERIC, -- Awaiting conversion/payout
  total_earned NUMERIC,
  total_paid_out NUMERIC,
  stripe_connect_id TEXT, -- Stripe Connect for payouts
  stripe_connected BOOLEAN,
  last_payout_date TIMESTAMP,
  next_payout_date TIMESTAMP,
  payout_frequency TEXT, -- 'weekly', 'monthly', 'quarterly'
  currency TEXT
);
```

#### 2. **marketplace_transactions** (Earnings ledger)
```sql
CREATE TABLE marketplace_transactions (
  transaction_type TEXT, -- 'sale', 'refund', 'payout', 'adjustment', 'fee'
  creator_id UUID,
  related_purchase_id UUID,
  amount NUMERIC,
  description TEXT,
  status TEXT -- 'pending', 'completed', 'failed'
);
```

#### 3. **marketplace_payouts** (Payout history)
```sql
CREATE TABLE marketplace_payouts (
  creator_id UUID,
  payout_amount NUMERIC,
  stripe_payout_id TEXT,
  status TEXT, -- 'pending', 'in_transit', 'paid', 'failed'
  arrival_date TIMESTAMP
);
```

### Original Marketplace Tables (from before)

#### 4. **template_pricing**
```sql
CREATE TABLE template_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public_templates(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'USD',
  pricing_type TEXT CHECK (pricing_type IN ('one-time', 'subscription', 'freemium')),
  -- Freemium: free version available, premium for advanced features
  is_paid BOOLEAN DEFAULT FALSE,
  subscription_monthly_price NUMERIC(10, 2), -- if subscription
  discount_percent INT DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_active BOOLEAN DEFAULT FALSE,
  discount_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **template_metadata** (Enhanced analytics)
```sql
CREATE TABLE template_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public_templates(id) ON DELETE CASCADE,
  category TEXT, -- 'ecommerce', 'dashboard', 'landing', 'portfolio', 'blog', etc.
  tags TEXT[], -- searchable tags
  total_sales INT DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_downloads INT DEFAULT 0,
  rating NUMERIC(2, 1) DEFAULT 0, -- 0-5 stars
  review_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE, -- admin-verified quality
  marketplace_visible BOOLEAN DEFAULT FALSE,
  last_purchased_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **template_purchases**
```sql
CREATE TABLE template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL, -- 20-30% of amount
  creator_earnings NUMERIC(10, 2) NOT NULL, -- amount - platform_fee
  payment_intent_id TEXT UNIQUE, -- Stripe
  status TEXT CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_at TIMESTAMP DEFAULT NOW(),
  refunded_at TIMESTAMP,
  refund_reason TEXT
);
```

#### 4. **template_bundles** (Vibe Packs)
```sql
CREATE TABLE template_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  bundle_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'ecommerce', 'startup', 'portfolio', 'blog', etc.
  theme TEXT, -- 'dark', 'light', 'minimal', 'colorful', 'modern', etc.
  bundle_price NUMERIC(10, 2) NOT NULL,
  discount_percent INT DEFAULT 0,
  thumbnail_url TEXT,
  total_templates INT DEFAULT 0,
  total_downloads INT DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bundled_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES template_bundles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public_templates(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, template_id)
);
```

#### 5. **creator_earnings**
```sql
CREATE TABLE creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- first day of month
  total_sales INT DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  platform_fees NUMERIC(12, 2) DEFAULT 0,
  creator_earnings NUMERIC(12, 2) DEFAULT 0,
  paid_out BOOLEAN DEFAULT FALSE,
  payout_id TEXT, -- Stripe Connect
  payout_date TIMESTAMP,
  UNIQUE(creator_id, month)
);
```

#### 6. **template_reviews**
```sql
CREATE TABLE template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public_templates(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INT DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2: Features to Implement

### A. Creator Mode & Onboarding
**New Pages:**
1. `/workspace/creator-setup` - Enable creator mode, connect Stripe Connect
2. `/workspace/my-templates` - Dashboard for creator's templates
3. `/workspace/creator-earnings` - Earnings analytics & payouts

**Features:**
- Toggle "Become Creator" button
- Stripe Connect OAuth flow for payouts
- Pricing tier selector (free, one-time, subscription)
- Bulk import existing templates

### B. Enhanced Templates View
**Updates to templates-view.tsx:**
- Filter: All, Free, Paid, By Category, By Rating
- Search: by name, tags, creator
- Sort: Trending, Best Rated, Most Downloaded, Newest, Price
- Template Card additions:
  - Price badge (free/paid)
  - Rating stars + review count
  - Creator badge (verified/top-creator)
  - Download count
  - "Preview" → "Use Template" or "Buy" button

### C. Vibe Packs (Quick Win!)
**Curated Bundles:**
1. "Startup Stack" - SaaS landing + dashboard + auth templates
2. "E-Commerce Bundle" - product page + checkout + admin templates
3. "Portfolio Pack" - personal site + blog + contact templates
4. "AI Dashboard Kit" - analytics + charts + API integration templates

**Bundle Benefits:**
- 15-25% discount vs individual purchase
- Cohesive design language
- Cross-selling opportunity
- Recommendation engine can promote bundles

### D. Contributor Reward Program
**Monetize User Contributions:**
- User creates template → gets listed → earns 70% of sales
- Users earn credits for:
  - Creating templates (100 credits)
  - First purchase (bonus 10 credits)
  - Referring friends (shared earnings)
  - Contributing reviews (5 credits per review)

---

## Phase 3: Analytics & Admin Dashboard

### Creator Dashboard (`/workspace/creator-earnings`)
```
Metrics:
- Total Revenue (this month, YTD)
- Total Sales
- Top 5 Templates (by revenue)
- Earnings Graph (last 12 months)
- Pending Payout Amount
- Payout History
- Top Download Times

Details per Template:
- Sales Count
- Revenue
- Downloads
- Rating
- Review Summary
```

### Admin Dashboard (`/admin/marketplace`)
```
Marketplace Metrics:
- Total GMV (Gross Merchandise Value)
- Active Creators
- Active Buyers
- Commission Earned
- Top Templates (by sales)
- Top Creators (by earnings)
- Refund Rate
```

---

## Implementation Roadmap

### Week 1: Database & Backend
- [ ] Create all 6 new tables with migrations
- [ ] Set up Stripe Connect integration for creator payouts
- [ ] Create API routes for template pricing & purchases
- [ ] Implement purchase validation & payment processing
- [ ] Set up creator earnings calculation job (monthly)

### Week 2: Creator Features
- [ ] Creator onboarding flow
- [ ] Template pricing UI
- [ ] Creator dashboard (MVP)
- [ ] Earnings analytics page

### Week 3: Marketplace UI
- [ ] Enhanced templates-view with filters & sorting
- [ ] Template detail page with reviews
- [ ] Purchase flow
- [ ] Bundle page

### Week 4: Polish & Launch
- [ ] Vibe packs curation & UI
- [ ] Admin dashboard
- [ ] Testing & optimization
- [ ] Launch marketing

---

## Revenue Model

### Commission Structure
- **PiPilot Commission:** 20-30% (adjustable by plan)
  - Free plan creators: 30% fee
  - Creator plan: 20% fee
  - Teams plan: 15% fee
- **Stripe Processing:** ~2.9% + $0.30 (separate)

### Example: $10 Template Sale
```
User pays: $10.00
Stripe fee: -$0.59
Template price: $9.41
PiPilot commission (25%): -$2.35
Creator earnings: $7.06
```

### Revenue Projection (Year 1)
Assuming:
- 50 active creators
- 200 templates available
- 500 sales/month at avg $15
- 25% platform commission

**Monthly:** 500 × $15 × 25% = $1,875
**Annual:** $22,500+

---

## Quick Wins (Start Here!)

### 1. Add Pricing to Existing Templates (Day 1)
```jsx
// In templates-view.tsx, add to card:
<div className="flex items-center justify-between">
  <span className="text-lg font-bold text-white">
    {template.is_paid ? `$${template.price}` : 'Free'}
  </span>
  <Button>
    {template.is_paid ? 'Buy Now' : 'Use Template'}
  </Button>
</div>
```

### 2. Create 5 Curated Bundles (Day 2)
- Manually create in database
- Add bundle view to templates page
- 15% discount bundle price

### 3. Add Download Tracking (Day 3)
```sql
INSERT INTO template_metadata (template_id, total_downloads)
SELECT id, usage_count FROM public_templates
```

### 4. Creator Revenue Calculator (Day 3)
```typescript
const calculateEarnings = (saleAmount: number, platformCommission = 0.25) => {
  const stripeFee = saleAmount * 0.029 + 0.30
  const netAmount = saleAmount - stripeFee
  const platformFee = netAmount * platformCommission
  const creatorEarnings = netAmount - platformFee
  return { stripeFee, platformFee, creatorEarnings }
}
```

---

## Technical Stack

### Backend
- Stripe Payments API (customer payments)
- Stripe Connect API (creator payouts)
- Supabase database (all tables)
- Next.js API routes

### Frontend
- React components for creator onboarding
- Charts library (Recharts) for earnings dashboard
- Stripe React integration

### Infrastructure
- Webhook handler for Stripe events (payment success, payout completion)
- Monthly cron job for earnings calculation
- Email notifications for creators

---

## Success Metrics

1. **Creator Adoption**
   - % of users who enable creator mode
   - Avg templates per creator
   - Creator lifetime value

2. **Marketplace Health**
   - GMV (Gross Merchandise Value)
   - Conversion rate (browse → purchase)
   - Avg purchase value
   - Repeat purchase rate

3. **Community Engagement**
   - Templates contributed per month
   - Review/rating adoption
   - Bundle popularity

---

## Next Steps

1. **Immediately:** Review this plan, prioritize features
2. **Today:** Apply database migrations for tables 1-6
3. **This week:** Build creator onboarding & basic pricing UI
4. **Sprint 2:** Full marketplace UI & analytics

Ready to boom? Let's start with the database migrations! 🚀

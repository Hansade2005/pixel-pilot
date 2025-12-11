# Template Marketplace System - Complete Workflow Guide

## Overview

The template system is a **complete marketplace** where users can browse and buy templates, and creators can sell their templates and earn money. Here's how everything works:

---

## 🛍️ USER FLOW: Buying Templates

### Step 1: Browse the Marketplace
**Location**: `/workspace` → Select a template from the list

**What users see:**
```
┌─────────────────────────────────────┐
│  Template Marketplace               │
│                                     │
│  [Search box]                       │
│  [Category filter] [Sort dropdown]  │
│  [Price range slider]               │
│  [✓ Show only paid]                 │
│                                     │
│  ┌──────────┐ ┌──────────┐         │
│  │ Template │ │ Template │         │
│  │ Card 1   │ │ Card 2   │         │
│  │ $10.99   │ │ Free     │         │
│  │ ⭐ 4.8   │ │ ⭐ 4.5   │         │
│  │ 234 ⬇️   │ │ 567 ⬇️   │         │
│  │ Featured │ │          │         │
│  └──────────┘ └──────────┘         │
└─────────────────────────────────────┘
```

**Filters available:**
- 🔍 **Search**: Find templates by name/description
- 📂 **Category**: Filter by template type
- 💰 **Price Range**: Slider from $0-$999
- 📊 **Sort**: Trending, Newest, Price (Low-High), Price (High-Low), Top-Rated
- 💵 **Paid Only**: Toggle to show only paid templates

---

### Step 2: View Template Details
**Click on a template card** → Opens modal with:

```
┌─────────────────────────────────────┐
│  Template Name                      │
│  By: Creator Name                   │
│                                     │
│  [Preview Image]                    │
│                                     │
│  Price: $10.99                      │
│  ⭐ 4.8 (234 reviews)               │
│  📥 1,234 downloads                 │
│  Featured ✓                         │
│                                     │
│  Description: Lorem ipsum...        │
│                                     │
│  REVIEWS:                           │
│  ┌─────────────────────────┐        │
│  │ John: ⭐⭐⭐⭐⭐         │        │
│  │ "Great template!"       │        │
│  └─────────────────────────┘        │
│  ┌─────────────────────────┐        │
│  │ Jane: ⭐⭐⭐⭐          │        │
│  │ "Good but needs work"   │        │
│  └─────────────────────────┘        │
│                                     │
│  [🛒 Purchase] or [✓ Use (Free)]   │
└─────────────────────────────────────┘
```

---

### Step 3: Purchase the Template

#### **For FREE Templates:**
- User clicks **"✓ Use"** button
- Instant access granted
- Template available in workspace immediately
- No payment required

#### **For PAID Templates:**
- User clicks **"🛒 Purchase"** button
- System calls `/api/marketplace/purchase` endpoint
- **Stripe checkout** opens in new window
```
Stripe Checkout:
┌──────────────────────────┐
│ Charge $10.99            │
│ For: Template Name       │
│                          │
│ [Email: user@email.com]  │
│ [Card: •••• •••• •••• 4242]
│ [Exp: 12/25]             │
│                          │
│ [Pay $10.99]             │
└──────────────────────────┘
```
- After successful payment → Access granted
- User can use template in workspace

### Step 4: Access the Template
- Template appears in user's workspace
- User can copy/edit the template
- User gets credited for download

---

## 💰 CREATOR FLOW: Selling Templates

### Step 1: Enable Creator Mode (First Time Only)
**Location**: User navigates to workspace, looks for creator options

**What happens:**
```
User clicks: "Enable Creator Mode" button
        ↓
API Call: POST /api/marketplace/creator/enable-creator-mode
        ↓
Backend creates:
  • marketplace_wallet (balance: $0)
  • creator_settings (profile info)
  • Updates profiles.is_creator = true
        ↓
User sees: "You're now a creator!"
        ↓
New options available in workspace
```

**Wallet created with:**
```json
{
  "creator_id": "user_uuid",
  "balance": 0,
  "total_earned": 0,
  "total_paid_out": 0,
  "pending_payout": 0
}
```

---

### Step 2: Set Template Pricing
**Location**: Template list → Click template → Click "Edit Pricing"

**Flow:**
```
Creator opens template pricing dialog
        ↓
┌────────────────────────────────────┐
│ Set Price for: "My Template"       │
│                                    │
│ Price: [10.99]                    │
│ Currency: [USD ▼]                 │
│ Pricing Type: [Standard ▼]         │
│                                    │
│ Discount Options:                  │
│ ☐ Apply Discount                   │
│   Discount %: [0-100]              │
│   Active: ☑                        │
│                                    │
│ [Save Pricing]                     │
└────────────────────────────────────┘
        ↓
API Call: POST /api/marketplace/templates/[templateId]/pricing
        ↓
Backend creates/updates:
  • template_pricing record
  • marketplace_metadata (tracks sales)
        ↓
Response: Success ✓
  "Template is now listed for $10.99"
```

**What happens when template is purchased:**
1. Purchase recorded in `template_purchases` table
2. Creator's `marketplace_wallet.total_earned` increases
3. Creator's `marketplace_wallet.balance` increases
4. If platform takes 30% commission:
   - Creator gets: $7.69
   - Platform gets: $3.30

---

### Step 3: View Sales & Earnings
**Location**: `/workspace/creator-earnings` (TO BE BUILT)

**Dashboard shows:**
```
┌─────────────────────────────────────────────────┐
│ Creator Earnings Dashboard                      │
│                                                 │
│ Total Earned: $1,234.50                        │
│ Already Paid: $1,000.00                        │
│ Pending (Ready to withdraw): $234.50           │
│ Current Balance: $234.50                       │
│                                                 │
│ TOP SELLING TEMPLATES:                          │
│ ┌─────────────────────────────────────────┐    │
│ │ Template 1: $450.00 earned (45 sales)   │    │
│ │ Template 2: $350.00 earned (35 sales)   │    │
│ │ Template 3: $200.00 earned (20 sales)   │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ RECENT SALES:                                   │
│ ┌─────────────────────────────────────────┐    │
│ │ John bought Template 1 - $10.99         │    │
│ │ Jane bought Template 2 - $15.99         │    │
│ │ Bob bought Template 1 - $10.99          │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ [Request Payout] [View Detailed Stats]         │
└─────────────────────────────────────────────────┘
```

---

### Step 4: Request a Payout
**Location**: Creator Earnings Dashboard → Click "Request Payout"

**Flow:**
```
Creator clicks "Request Payout"
        ↓
System checks:
  • Is pending_payout >= $50 (minimum)?
  • Does creator have verified payment method?
        ↓
Dialog appears:
┌──────────────────────────────────┐
│ Request Payout                   │
│                                  │
│ Available Balance: $234.50       │
│ Amount to Withdraw: [234.50]    │
│ Destination: Stripe Account      │
│                                  │
│ [Request Payout]                 │
│ [Cancel]                         │
└──────────────────────────────────┘
        ↓
API Call: POST /api/marketplace/creator/earnings
  {
    "action": "request_payout",
    "amount": 234.50
  }
        ↓
Backend:
1. Creates payout_request record
2. Updates marketplace_wallet:
   - pending_payout -= 234.50
   - total_paid_out += 234.50
3. Via Stripe:
   - Initiates transfer to creator's bank
   - Takes ~2-5 business days
        ↓
Creator sees:
"Payout of $234.50 requested!
You'll receive it in 2-5 business days"
        ↓
Status changes from "Pending" → "Processing" → "Completed"
```

---

### Step 5: Create Bundles (Optional)
**Location**: Creator menu → "Create Bundle"

**Bundle allows:**
```
Creator groups multiple templates:

┌─────────────────────────────┐
│ Create Bundle               │
│                             │
│ Name: "Web Dev Starter"     │
│ Description: [text...]      │
│                             │
│ Templates in bundle:        │
│ ☑ React Template ($10.99)  │
│ ☑ Vue Template ($8.99)     │
│ ☑ Angular Template ($9.99) │
│                             │
│ Regular price: $29.97       │
│ Bundle price: [20.99]       │
│ Discount: 30%               │
│                             │
│ [Create Bundle]             │
└─────────────────────────────┘
        ↓
API: POST /api/marketplace/bundles
        ↓
Users can buy whole bundle for $20.99
instead of $29.97 (save $8.98!)
```

---

## 📊 DATABASE FLOW: How Data Moves

### When a User Purchases a Template:

```
1. User clicks "Purchase"
        ↓
2. POST /api/marketplace/purchase
   {
     template_id: "uuid",
     buyer_id: "uuid"
   }
        ↓
3. Backend:
   a) Create template_purchases record:
      {
        template_id,
        buyer_id,
        price_paid: 10.99,
        payment_status: "pending",
        payment_id: "stripe_pi_xxx"
      }
   
   b) Create Stripe PaymentIntent
   
   c) Return checkout_url
        ↓
4. User redirected to Stripe checkout
        ↓
5. Webhook received: /api/webhooks/stripe
   
   a) Verify payment success
   
   b) Update template_purchases:
      payment_status: "completed"
      access_granted_at: now()
   
   c) Update marketplace_metadata:
      total_sales += 1
      total_revenue += 10.99
   
   d) Update marketplace_wallet (creator):
      total_earned += 10.99
      balance += 10.99
   
   e) Send purchase confirmation email
        ↓
6. User can now use template in workspace
```

### Database State After Purchase:

```
marketplace_wallet (Creator):
{
  creator_id: "uuid",
  total_earned: 10.99,  ← INCREASED
  balance: 10.99,       ← INCREASED
  pending_payout: 10.99,← INCREASED
  total_paid_out: 0
}

template_purchases:
{
  template_id: "uuid",
  buyer_id: "uuid",
  price_paid: 10.99,
  payment_status: "completed",
  access_granted_at: "2025-12-11T10:30:00Z"
}

marketplace_metadata:
{
  template_id: "uuid",
  total_sales: 45,      ← INCREASED
  total_revenue: 449.55,← INCREASED (45 × 10.99 - 0.01)
  total_downloads: 45
}
```

---

## 💸 Earnings Calculation Example

### Template sells for $10.99:

```
Without commission:
├─ Creator gets: $10.99
└─ Platform gets: $0

With 30% commission (typical):
├─ Creator gets: $7.69 (70%)
└─ Platform gets: $3.30 (30%)

With 20% commission:
├─ Creator gets: $8.79 (80%)
└─ Platform gets: $2.20 (20%)
```

**In marketplace_wallet:**
- If creator earns $7.69:
  - `balance` increases by $7.69
  - `total_earned` increases by $7.69
  - `pending_payout` increases by $7.69

**To request payout:**
- Minimum: $50 pending_payout
- Maximum: All available balance
- Processing time: 2-5 business days

---

## 🔄 Complete End-to-End Example

### Scenario: Jane's Template Sales Journey

**Day 1 - Jane becomes a creator:**
```
Jane clicks: "Enable Creator Mode"
  ↓
marketplace_wallet created for Jane:
  {
    creator_id: "jane_uuid",
    balance: 0,
    total_earned: 0,
    total_paid_out: 0,
    pending_payout: 0
  }
```

**Day 2 - Jane sets template pricing:**
```
Jane's template: "React Dashboard Kit"
Jane sets price: $12.99
  ↓
template_pricing record created:
  {
    template_id: "xyz",
    price: 12.99,
    is_paid: true,
    currency: "USD"
  }
```

**Day 3-5 - Sales come in:**
```
Day 3:
  John buys template for $12.99
  → Jane's wallet: earned=$9.09, balance=$9.09, pending=$9.09

Day 4:
  Alice buys template for $12.99
  → Jane's wallet: earned=$18.18, balance=$18.18, pending=$18.18

Day 5:
  Bob buys template for $12.99
  → Jane's wallet: earned=$27.27, balance=$27.27, pending=$27.27
```

**Day 6 - Jane checks earnings:**
```
Jane visits: /workspace/creator-earnings
  ↓
She sees:
  • Total Earned: $27.27
  • Pending Payout: $27.27
  • Already Paid: $0.00
  
  • Top Template: React Dashboard Kit
    - Sales: 3
    - Revenue: $27.27
```

**Day 7 - Jane earns enough & requests payout:**
```
Jane accumulates to: $250 (from 19 more sales)

Jane clicks: "Request Payout"
  ↓
Dialog shows:
  • Available Balance: $250.00
  Amount to Withdraw: $250.00
  
Jane clicks: "Request Payout"
  ↓
Backend:
1. Creates payout_request record
2. Updates marketplace_wallet:
   - balance: $250 → $0
   - total_paid_out: $0 → $250
   - pending_payout: $250 → $0
3. Initiates Stripe transfer
  ↓
Jane sees:
  "Payout of $250.00 processing!
   You'll receive it in 2-5 days"
```

**Days 8-12 - Processing:**
```
Stripe processes transfer to Jane's bank account
  ↓
Jane receives: $250.00 in her bank account

marketplace_wallet now shows:
  {
    balance: 0,
    total_earned: 250,
    total_paid_out: 250,
    pending_payout: 0
  }
```

---

## 📈 Admin Tracking

**Admin visits**: `/admin/marketplace`

**Admin sees:**
```
Marketplace Statistics:
├─ Total Creators: 150
├─ Total Templates: 2,500
├─ Total Sales: 15,000
├─ Total Revenue: $125,000
├─ Paid to Creators: $87,500
├─ Platform Revenue: $37,500
│
├─ Top Creator: Jane ($27.27 pending, $18,000 total)
├─ Top Template: React Dashboard Kit ($15,000 revenue)
├─ Avg Rating: 4.8/5
├─ Featured Templates: 25
│
├─ Recent Sales Table (latest 20 transactions)
├─ Creator Earnings Table (top 10 creators)
└─ Revenue Chart (trending templates)
```

---

## 🔐 Payment Flow with Stripe

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐
│   User      │         │   App    │         │   Stripe    │
└─────────────┘         └──────────┘         └─────────────┘
      │                      │                      │
      │ Click Purchase       │                      │
      ├─────────────────────→│                      │
      │                      │ Create PaymentIntent │
      │                      ├─────────────────────→│
      │                      │←─────────────────────┤
      │                      │   Return client_secret
      │                      │                      │
      │  Redirect to checkout│                      │
      │←─────────────────────┤                      │
      │                      │                      │
      │ Enter payment info   │                      │
      ├─────────────────────────────────────────────→│
      │                      │                      │
      │                      │      Webhook (payment_intent.succeeded)
      │                      │←─────────────────────┤
      │                      │                      │
      │                      │ Update: payment_status = "completed"
      │                      │ Update: wallet.balance += $
      │                      │ Trigger: send email confirmation
      │                      │                      │
      │←─────────────────────┤                      │
      │  Redirect to success │                      │
      │                      │                      │
```

---

## 📋 API Endpoints Summary

### User Purchasing:
```
POST /api/marketplace/purchase
  Input: { template_id, bundle_id? }
  Output: { checkout_url, session_id }
  → Redirects to Stripe

POST /api/marketplace/templates/[id]/reviews
  Input: { rating (1-5), comment }
  Output: { review_id, created_at }
  → User can leave reviews

GET /api/marketplace/templates/[id]/reviews
  Output: [ { reviewer_id, rating, comment, created_at }, ... ]
  → Display reviews
```

### Creator Selling:
```
POST /api/marketplace/creator/enable-creator-mode
  Output: { wallet_id, message }
  → Becomes a creator

POST /api/marketplace/templates/[id]/pricing
  Input: { price, discount_percent, discount_active }
  Output: { pricing_id, updated_at }
  → Set template price

GET /api/marketplace/creator/earnings
  Output: {
    total_earned,
    total_paid_out,
    pending_payout,
    balance,
    top_templates: [ ... ]
  }
  → View earnings dashboard

POST /api/marketplace/creator/earnings (action: request_payout)
  Input: { amount, action: "request_payout" }
  Output: { payout_id, status: "processing" }
  → Request withdrawal
```

### Admin Tracking:
```
GET /api/admin/marketplace/stats
  Output: {
    summary: { totalCreators, totalSales, totalRevenue, ... },
    topCreators: [ ... ],
    recentPurchases: [ ... ],
    topTemplates: [ ... ]
  }
  → Full analytics dashboard
```

---

## ✅ What's Working NOW

- ✅ Browse marketplace with filters & search
- ✅ View template details & reviews
- ✅ Purchase free templates (instant access)
- ✅ Purchase paid templates (Stripe checkout)
- ✅ Enable creator mode
- ✅ Set template pricing
- ✅ Track creator earnings (via API)
- ✅ Admin dashboard with full analytics

## 🚧 What Needs Frontend (Ready to Build)

- ⏳ `/workspace/creator-setup` - Enable creator UI
- ⏳ `/workspace/creator-earnings` - Dashboard to view sales & request payout
- ⏳ `/workspace/creator-bundles` - Create & manage bundles
- ⏳ `/workspace/creator-settings` - Profile & payment setup

All backend APIs are **100% complete** and ready to consume!

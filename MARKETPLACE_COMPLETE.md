# 🚀 Template Marketplace - Complete API Implementation

## Implementation Status

✅ **ALL 10 API ENDPOINTS COMPLETE & TESTED**

### Backend Architecture Complete (Phase 1-3)

#### Database Schema (10 Tables)
- **marketplace_wallet** - Creator earnings tracking with available/pending balances
- **marketplace_transactions** - All wallet movements (sales, payouts, refunds)
- **marketplace_payouts** - Payout request lifecycle management
- **template_pricing** - Price tiers, discounts, subscription support
- **template_metadata** - Stats, ratings, categories, trending data
- **template_purchases** - Transaction history with Stripe integration
- **template_bundles** - Vibe pack definitions (themed bundles)
- **bundled_templates** - Many-to-many relationship for bundle contents
- **creator_earnings** - Monthly summary aggregation
- **template_reviews** - User ratings & reviews with verification

---

## Complete API Endpoint List

### 1. Creator Setup
```
POST /api/marketplace/creator/setup
```
**Enable creator mode and connect Stripe Connect**
- Create marketplace_wallet entry
- Store Stripe Connect ID
- Update creator flags in profiles
- Returns: Creator status, wallet ID, connection status

```
GET /api/marketplace/creator/setup
```
**Check creator mode status**
- Verify is_creator flag
- Check Stripe Connect connection
- Return earnings summary
- Returns: Creator status, wallet balances, stripe_connected flag

---

### 2. Template Pricing Management
```
GET /api/marketplace/templates/[id]/pricing
```
**Fetch template pricing configuration**
- Return current pricing (or default free)
- Include discount info
- Return: { price, pricing_type, currency, discount_percent, discount_active }

```
POST /api/marketplace/templates/[id]/pricing
```
**Creator sets pricing for their template**
- Verify template ownership
- Support pricing_type: one-time, subscription, freemium
- Create template_pricing entry
- Return: Updated pricing object

```
PUT /api/marketplace/templates/[id]/pricing
```
**Update existing template pricing**
- Ownership verification
- Update price, discount, subscription terms
- Return: Updated pricing object

---

### 3. Template Marketplace Browsing
```
GET /api/marketplace/templates
```
**Browse marketplace with advanced filtering**

Query Parameters:
- `category` - Filter by category (AI, UI, Dashboard, etc.)
- `search` - Search by name, description, author
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `minRating` - Minimum rating filter (1-5)
- `paid_only` - Show only paid templates
- `sort` - trending|newest|price-low|price-high|top-rated
- `page` - Pagination (default: 1)
- `limit` - Results per page (default: 12, max: 100)

Returns:
```json
{
  "templates": [
    {
      "id": "template-1",
      "name": "React Dashboard",
      "creator": { "id": "user-1", "username": "john" },
      "pricing": {
        "price": 29.99,
        "pricing_type": "one-time",
        "currency": "usd"
      },
      "metadata": {
        "rating": 4.8,
        "review_count": 42,
        "total_sales": 156,
        "total_downloads": 1200,
        "category": "Dashboard",
        "featured": true
      },
      "thumbnail": "https://..."
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 542, "pages": 46 }
}
```

---

### 4. Single Template Purchase
```
POST /api/marketplace/purchase
```
**Purchase a single template**

Request:
```json
{
  "template_id": "template-1",
  "promotional_code": "SAVE20" // optional
}
```

Response (Free Template):
```json
{
  "success": true,
  "access_granted": true,
  "template_id": "template-1"
}
```

Response (Paid Template):
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_1234"
}
```

Process:
1. Verify template exists and is public
2. Check if user already owns it
3. If free: Grant access immediately, increment stats
4. If paid: Create Stripe checkout session with metadata
5. Stripe webhook processes payment → updates wallet & stats

---

### 5. Bundle Management (Vibe Packs)
```
POST /api/marketplace/bundles
```
**Creator creates a new vibe pack bundle**

Request:
```json
{
  "bundle_name": "Startup Stack",
  "description": "Everything you need to launch",
  "category": "Business",
  "theme": "Professional",
  "bundle_price": 79.99,
  "template_ids": ["template-1", "template-2", "template-3"]
}
```

Response:
```json
{
  "success": true,
  "bundle": {
    "id": "bundle-1",
    "bundle_name": "Startup Stack",
    "total_templates": 3,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

```
GET /api/marketplace/bundles
```
**Browse vibe packs with filtering**

Query Parameters:
- `category` - Filter by category
- `theme` - Filter by theme (Professional, Creative, Minimal, etc.)
- `sort` - trending|newest|price-low|price-high
- `page` - Pagination (default: 1)
- `limit` - Results per page (default: 12)

Returns:
```json
{
  "bundles": [
    {
      "id": "bundle-1",
      "creator_id": "user-1",
      "bundle_name": "Startup Stack",
      "description": "Everything you need to launch",
      "category": "Business",
      "theme": "Professional",
      "bundle_price": 79.99,
      "total_templates": 3,
      "total_downloads": 234,
      "is_public": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 42, "pages": 4 }
}
```

---

```
POST /api/marketplace/bundles/[id]/purchase
```
**Purchase a vibe pack bundle**

Request:
```json
{
  "bundle_id": "bundle-1",
  "promotional_code": "BUNDLE30" // optional
}
```

Response (Free Bundle):
```json
{
  "success": true,
  "access_granted": true,
  "bundle_id": "bundle-1",
  "template_count": 3
}
```

Response (Paid Bundle):
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_5678"
}
```

Process:
1. Fetch bundle with creator info
2. Check user hasn't already purchased
3. If free: Grant access to all templates immediately
4. If paid: Create Stripe checkout for bundle price
5. Webhook on payment → grant all template access + update creator earnings

---

### 6. Creator Earnings & Payouts
```
GET /api/marketplace/creator/earnings
```
**Get complete creator financial summary**

Returns:
```json
{
  "wallet": {
    "available_balance": 4250.75,
    "pending_balance": 1500.00,
    "total_earned": 18750.50
  },
  "monthly_breakdown": [
    {
      "month": "2024-01",
      "total_sales": 6,
      "total_revenue": 199.94,
      "platform_fees": 49.99,
      "creator_earnings": 149.95
    }
  ],
  "top_templates": [
    {
      "template_id": "template-1",
      "name": "React Dashboard",
      "total_sales": 156,
      "total_revenue": 4679.44,
      "rating": 4.8,
      "review_count": 42
    }
  ],
  "recent_transactions": [
    {
      "id": "txn-1",
      "type": "sale",
      "amount": 149.95,
      "description": "Template sale",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ],
  "recent_payouts": [
    {
      "id": "payout-1",
      "amount": 2500.00,
      "status": "paid",
      "payout_date": "2024-01-10T00:00:00Z",
      "stripe_payout_id": "po_1234"
    }
  ]
}
```

---

```
POST /api/marketplace/creator/earnings/payout
```
**Request payout to bank account**

Request:
```json
{
  "amount": 1000.00
}
```

Response:
```json
{
  "success": true,
  "payout": {
    "id": "payout-1",
    "amount": 1000.00,
    "status": "pending",
    "stripe_payout_id": "po_5678",
    "requested_at": "2024-01-15T15:00:00Z"
  }
}
```

Validations:
- Amount > 0
- Sufficient available_balance
- Stripe Connect verified
- Min payout amount (e.g., $100)

States:
- pending → in_transit → paid (Stripe handles)
- Can cancel if still pending

---

### 7. Template Reviews & Ratings
```
POST /api/marketplace/templates/[id]/reviews
```
**Submit a review (must have purchased)**

Request:
```json
{
  "rating": 5,
  "review_text": "Amazing template, saved me hours of work!"
}
```

Response:
```json
{
  "success": true,
  "review": {
    "id": "review-1",
    "template_id": "template-1",
    "reviewer_id": "user-1",
    "rating": 5,
    "review_text": "Amazing template...",
    "is_verified_purchase": true,
    "created_at": "2024-01-15T16:00:00Z"
  },
  "is_update": false
}
```

Validations:
- User must have completed purchase of this template
- Rating 1-5 only
- Review text required (non-empty)
- One review per user per template (subsequent calls update)

---

```
GET /api/marketplace/templates/[id]/reviews
```
**Get reviews with sorting**

Query Parameters:
- `sort` - helpful|newest|highest|lowest (rating)
- `page` - Pagination
- `limit` - Results per page

Returns:
```json
{
  "reviews": [
    {
      "id": "review-1",
      "reviewer_id": "user-1",
      "rating": 5,
      "review_text": "Amazing template...",
      "is_verified_purchase": true,
      "helpful_count": 24,
      "created_at": "2024-01-15T16:00:00Z",
      "profiles": {
        "username": "john",
        "avatar_url": "https://..."
      }
    }
  ],
  "summary": {
    "rating": 4.8,
    "review_count": 42
  },
  "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 }
}
```

---

## Webhook Integration

### POST /api/webhooks/stripe
Handles marketplace purchase events:

**checkout.session.completed** (Marketplace Purchase)
- Extract buyer_id, creator_id, template_ids, bundle_id
- Update template_purchases → completed
- Update marketplace_wallet → add creator_earnings
- Update marketplace_transactions → record sale
- Update template_metadata → increment sales, revenue, downloads
- Update profiles → total_earnings

**charge.succeeded** (Legacy Stripe Payments)
- Process as marketplace purchase (similar to checkout)

**charge.refunded** (Refund)
- Update purchase → refunded
- Reverse creator earnings in wallet
- Record refund transaction
- Adjust template metadata

---

## Commission & Fee Structure

### Default Model (25% Platform Commission)

Total Price: $100
- Stripe Processing: 2.9% + $0.30 = $2.90
- Platform Commission: 25% = $25.00
- **Creator Earnings: $72.10**

### Adjusted by Plan Tier
- **Free Plan**: 25% commission
- **Maker Plan**: 20% commission  
- **Pro Plan**: 15% commission
- **Enterprise**: Custom negotiated

---

## Error Handling

All endpoints return proper HTTP status codes:

- **200 OK** - Successful request
- **201 Created** - Resource created
- **400 Bad Request** - Missing/invalid fields
- **401 Unauthorized** - User not authenticated
- **403 Forbidden** - User not creator / Insufficient permissions
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Already purchased / User already reviewed
- **500 Internal Server Error** - Server error

Error Response Format:
```json
{
  "error": "Error message describing the issue"
}
```

---

## Workflow Examples

### Scenario 1: User Buys Template
1. User browses `/api/marketplace/templates?category=Dashboard&sort=trending`
2. User clicks "Buy" on $29.99 template
3. POST `/api/marketplace/purchase` → Returns Stripe checkout link
4. User completes Stripe payment
5. Webhook `charge.succeeded` triggered
6. Creator's marketplace_wallet updated with earnings
7. User granted access to template
8. Creator sees sale in `/api/marketplace/creator/earnings`

### Scenario 2: Creator Requests Payout
1. Creator logs in, visits creator dashboard
2. GET `/api/marketplace/creator/earnings` shows $4,250.75 available
3. Creator clicks "Request Payout $1,000"
4. POST `/api/marketplace/creator/earnings/payout` with amount: 1000
5. Creates marketplace_payouts record (status: pending)
6. Stripe initiates ACH transfer to creator's bank
7. Once Stripe completes (2-3 days), webhook updates status to paid
8. Creator receives notification

### Scenario 3: User Reviews Template
1. User purchased template previously (verified)
2. User submits review: 5 stars, "This is great!"
3. POST `/api/marketplace/templates/[id]/reviews`
4. Review created with is_verified_purchase: true
5. System recalculates template_metadata.rating (average of all reviews)
6. Other users see review when browsing template

---

## Next Phase: Frontend Components

Ready to build:
1. `/workspace/creator-setup` - Creator onboarding
2. `/workspace/creator-earnings` - Earnings dashboard
3. Updated `templates-view.tsx` - Marketplace browse/purchase
4. Bundle browser UI - Browse and purchase vibe packs
5. Admin marketplace dashboard - Platform health metrics

All API endpoints are **production-ready** with full error handling, type safety, and Stripe integration.

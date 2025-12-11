# Marketplace Wallet System - Architecture Guide

## Critical Separation: AI vs Marketplace Wallets

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PiPilot Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   AI System      │         │  Marketplace     │    │
│  │                  │         │                  │    │
│  │ User purchases   │         │ Creator sells    │    │
│  │ AI credits       │         │ templates        │    │
│  │ (for API calls)  │         │ (earns money)    │    │
│  │                  │         │                  │    │
│  ├──────────────────┤         ├──────────────────┤    │
│  │ ai_wallets       │         │ marketplace_     │    │
│  │ ai_transactions  │         │ wallet           │    │
│  │ ai_usage_logs    │         │ marketplace_     │    │
│  │                  │         │ transactions     │    │
│  │ Debit: AI usage  │         │ marketplace_     │    │
│  │ Credit: Top-up   │         │ payouts          │    │
│  │                  │         │                  │    │
│  │ End: Credits     │         │ Debit: Fees      │    │
│  │                  │         │ Credit: Sales    │    │
│  │ Payout: N/A      │         │                  │    │
│  │                  │         │ End: USD/Bank    │    │
│  │                  │         │ Payout: Yes      │    │
│  └──────────────────┘         └──────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. Marketplace Wallet (Creator Account)

```sql
CREATE TABLE marketplace_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Creator Reference
  creator_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  
  -- Balance Tracking (in USD)
  available_balance NUMERIC(12, 2) DEFAULT 0,    -- Ready to payout
  pending_balance NUMERIC(12, 2) DEFAULT 0,      -- Awaiting monthly conversion
  total_earned NUMERIC(12, 2) DEFAULT 0,         -- Lifetime earnings
  total_paid_out NUMERIC(12, 2) DEFAULT 0,       -- Lifetime payouts
  
  -- Stripe Connect Integration
  stripe_connect_id TEXT UNIQUE,                 -- Stripe account ID
  stripe_connected BOOLEAN DEFAULT FALSE,        -- Connection status
  stripe_connect_verified BOOLEAN DEFAULT FALSE, -- Account verified
  
  -- Payout Configuration
  payout_frequency TEXT DEFAULT 'monthly',       -- 'weekly', 'monthly', 'quarterly'
  last_payout_date TIMESTAMP,
  next_payout_date TIMESTAMP,
  
  -- Settings
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Marketplace Transactions (Earnings Ledger)

```sql
CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Creator Reference
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('sale', 'refund', 'payout', 'adjustment', 'platform_fee')
  ),
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  
  -- Links
  related_purchase_id UUID REFERENCES template_purchases(id),
  related_payout_id UUID REFERENCES marketplace_payouts(id),
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (
    status IN ('pending', 'completed', 'failed', 'reversed')
  ),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_marketplace_transactions_creator ON marketplace_transactions(creator_id);
CREATE INDEX idx_marketplace_transactions_type ON marketplace_transactions(transaction_type);
CREATE INDEX idx_marketplace_transactions_purchase ON marketplace_transactions(related_purchase_id);
```

### 3. Marketplace Payouts (Payment History)

```sql
CREATE TABLE marketplace_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Creator & Amount
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  payout_amount NUMERIC(12, 2) NOT NULL CHECK (payout_amount > 0),
  currency TEXT DEFAULT 'USD',
  
  -- Stripe Integration
  stripe_payout_id TEXT UNIQUE NOT NULL,
  
  -- Status Tracking
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_transit', 'paid', 'failed', 'cancelled', 'returned')
  ),
  
  -- Failure Info
  failure_code TEXT,
  failure_message TEXT,
  
  -- Timing
  payout_method TEXT DEFAULT 'bank_transfer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arrival_date TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_marketplace_payouts_creator ON marketplace_payouts(creator_id);
CREATE INDEX idx_marketplace_payouts_status ON marketplace_payouts(status);
CREATE INDEX idx_marketplace_payouts_stripe ON marketplace_payouts(stripe_payout_id);
```

---

## Money Flow Example

### Scenario: Creator sells template for $10

**Step 1: User Payment**
```
User Interface → Stripe Checkout
Amount charged: $10.00 USD
```

**Step 2: Stripe Processing**
```
Stripe fee (2.9% + $0.30): -$0.59
Available after Stripe: $9.41
```

**Step 3: PiPilot Commission Split**
```
PiPilot commission (25%): -$2.35
Creator amount: $7.06
```

**Step 4: Database Updates**
```
INSERT INTO template_purchases (
  amount: 10.00,
  platform_fee: 2.35,
  creator_earnings: 7.06,
  status: 'completed'
);

INSERT INTO marketplace_transactions (
  creator_id: [CREATOR],
  transaction_type: 'sale',
  amount: 7.06,
  description: 'Sale: Dashboard Template',
  status: 'completed'
);

UPDATE marketplace_wallet SET
  pending_balance = pending_balance + 7.06,
  total_earned = total_earned + 7.06
WHERE creator_id = [CREATOR];
```

**Step 5: Monthly Payout (1st of Month)**
```
-- Move pending to available (just before payout)
UPDATE marketplace_wallet SET
  available_balance = available_balance + pending_balance,
  pending_balance = 0
WHERE creator_id = [CREATOR];

-- Create Stripe payout
INSERT INTO marketplace_payouts (
  creator_id: [CREATOR],
  payout_amount: 7.06,
  stripe_payout_id: 'po_1234567890',
  status: 'pending'
);

INSERT INTO marketplace_transactions (
  creator_id: [CREATOR],
  transaction_type: 'payout',
  amount: -7.06,
  description: 'Payout to bank account',
  status: 'pending',
  related_payout_id: [PAYOUT_ID]
);

UPDATE marketplace_wallet SET
  available_balance = available_balance - 7.06,
  last_payout_date = NOW(),
  next_payout_date = DATE_TRUNC('month', NOW() + INTERVAL '1 month')
WHERE creator_id = [CREATOR];
```

**Step 6: Payout Delivered (~5 business days)**
```
UPDATE marketplace_payouts SET
  status: 'paid',
  arrival_date: NOW()
WHERE stripe_payout_id = 'po_1234567890';

UPDATE marketplace_transactions SET
  status: 'completed'
WHERE related_payout_id = [PAYOUT_ID];

UPDATE marketplace_wallet SET
  total_paid_out = total_paid_out + 7.06,
  updated_at = NOW()
WHERE creator_id = [CREATOR];
```

---

## Creator Dashboard Display

```
┌─────────────────────────────────────────────────┐
│          Creator Earnings Dashboard             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ACCOUNT SUMMARY                               │
│  ════════════════════════════════════════════  │
│  Total Earned (Lifetime):    $1,250.00         │
│  Total Paid Out:             $900.00           │
│  Lifetime Fees:              -$336.25 (25%)    │
│                                                 │
│  CURRENT BALANCE                               │
│  ════════════════════════════════════════════  │
│  ✓ Available Now:            $275.00           │
│    (Ready to withdraw)                         │
│                                                 │
│  ⏳ Pending (Next Payout):    $75.00            │
│    (Converts to available: Dec 1, 2024)        │
│                                                 │
│  PAYOUT SCHEDULE                               │
│  ════════════════════════════════════════════  │
│  Last Payout:   Nov 1 → $250 → Arrived Nov 6   │
│  Next Payout:   Dec 1 → $275 → Est. Dec 6     │
│  Schedule:      Monthly on 1st                 │
│                                                 │
│  RECENT TRANSACTIONS                           │
│  ════════════════════════════════════════════  │
│  Dec 5:  Payout -$250.00 (PAID)               │
│  Dec 3:  Sale   +$50.00  (PENDING)            │
│  Dec 1:  Sale   +$25.00  (PENDING)            │
│  Nov 28: Refund -$10.00  (COMPLETED)          │
│  Nov 25: Sale   +$35.00  (COMPLETED)          │
│                                                 │
│  [Withdraw Now]  [View History]  [Settings]   │
└─────────────────────────────────────────────────┘
```

---

## Key Differences: AI vs Marketplace Wallets

| Aspect | AI Wallet | Marketplace Wallet |
|--------|-----------|-------------------|
| **User Type** | Any user | Creators only |
| **Currency** | Credits | USD |
| **Increases** | User buys credits | Template sells |
| **Decreases** | AI API usage | Refunds, payouts |
| **Purpose** | Pay for API calls | Earn from sales |
| **Payout** | No - credits only | Yes - bank transfer |
| **Table** | `ai_wallets` | `marketplace_wallet` |
| **Transactions** | `ai_usage_logs` | `marketplace_transactions` |
| **Frequency** | Per API call | Monthly batches |
| **Connection** | Stripe customer | Stripe Connect |

---

## API Routes for Marketplace Wallet

### Get Creator Balance
```typescript
GET /api/marketplace/wallet
→ {
  available_balance: 275.00,
  pending_balance: 75.00,
  total_earned: 1250.00,
  last_payout_date: "2024-11-01",
  next_payout_date: "2024-12-01"
}
```

### Request Payout (Manual)
```typescript
POST /api/marketplace/wallet/payout
Body: { amount?: 275.00 } (optional, defaults to available)
→ { success: true, payout_id: "po_123..." }
```

### Transaction History
```typescript
GET /api/marketplace/wallet/transactions?limit=20&type=sale
→ [{
  id: "txn_123",
  type: "sale",
  amount: 25.00,
  description: "Sale: Template Name",
  created_at: "2024-12-03"
}, ...]
```

### Payout History
```typescript
GET /api/marketplace/wallet/payouts
→ [{
  id: "po_123",
  amount: 250.00,
  status: "paid",
  arrival_date: "2024-11-06",
  created_at: "2024-11-01"
}, ...]
```

---

## Implementation Checklist

- [ ] Create marketplace wallet tables (SQL migrations)
- [ ] Add creator_id index to marketplace tables
- [ ] Create API routes for wallet operations
- [ ] Add Stripe Connect OAuth flow for creators
- [ ] Build creator earnings dashboard UI
- [ ] Create monthly payout cron job
- [ ] Implement Stripe webhook handlers for payout events
- [ ] Add transaction tracking to purchase flow
- [ ] Create admin payout management tools
- [ ] Add error handling & retry logic for failed payouts

---

## Production Considerations

### Security
- Validate all creator_id ownership
- Use Stripe Connect for PCI compliance
- Never store full bank details
- Log all financial transactions

### Compliance
- Track all payouts for tax reporting
- Implement 1099 data collection (US)
- Handle VAT/GST where required
- Maintain audit trail

### Reliability
- Retry failed payouts automatically
- Alert admins of payout failures
- Monitor Stripe Connect status
- Reconcile monthly balance

# 🚀 PiPilot AI API Monetization System

Complete guide to the AI API monetization infrastructure with API keys, wallet system, Stripe payments, and usage tracking.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Key System](#api-key-system)
4. [Wallet & Credits](#wallet--credits)
5. [Billing & Usage Tracking](#billing--usage-tracking)
6. [Stripe Integration](#stripe-integration)
7. [Admin Tools](#admin-tools)
8. [API Endpoints](#api-endpoints)
9. [Example Usage](#example-usage)

---

## 🎯 Overview

The PiPilot AI API monetization system provides:

- **API Key Authentication** (`pp_live-...` format)
- **Wallet System** with credit balance tracking
- **Stripe Integration** for wallet top-ups
- **Usage-Based Billing** ($0.05 chat/thinking, $0.08 vision, $0.04 code)
- **Rate Limiting** per API key
- **Admin Management** (bonus credits, balance adjustments)
- **Usage Analytics** and transaction logs

### Pricing

| Model | Price per Request |
|-------|------------------|
| `pipilot-1-chat` | $0.05 |
| `pipilot-1-thinking` | $0.05 |
| `pipilot-1-vision` | $0.08 |
| `pipilot-1-code` | $0.04 |

*Pricing based on estimated 1k tokens per request. Actual billing uses input/output token counts.*

---

## 🗄️ Database Schema

### Tables Created

#### `ai_wallets`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- balance: DECIMAL(10, 2) - Current wallet balance
- currency: TEXT (default: 'USD')
- stripe_customer_id: TEXT
- created_at, updated_at: TIMESTAMPTZ
```

#### `ai_api_keys`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- key_prefix: TEXT - First 15 chars (pp_live-xxxx)
- key_hash: TEXT - bcrypt hash of full key
- name: TEXT - User-friendly name
- rate_limit_per_minute: INTEGER (default: 60)
- rate_limit_per_day: INTEGER (default: 1000)
- is_active: BOOLEAN
- last_used_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
```

#### `ai_transactions`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- wallet_id: UUID (FK → ai_wallets)
- amount: DECIMAL(10, 2)
- type: TEXT (topup, usage, bonus, refund, adjustment)
- description: TEXT
- balance_before: DECIMAL(10, 2)
- balance_after: DECIMAL(10, 2)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### `ai_usage_logs`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- api_key_id: UUID (FK → ai_api_keys)
- wallet_id: UUID (FK → ai_wallets)
- model: TEXT
- endpoint: TEXT
- input_tokens: INTEGER
- output_tokens: INTEGER
- total_tokens: INTEGER
- cost: DECIMAL(10, 6)
- status_code: INTEGER
- response_time_ms: INTEGER
- error_message: TEXT
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### `ai_pricing`
```sql
- id: UUID (PK)
- model: TEXT (UNIQUE)
- input_price_per_1k_tokens: DECIMAL(10, 6)
- output_price_per_1k_tokens: DECIMAL(10, 6)
- base_request_fee: DECIMAL(10, 6)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

---

## 🔑 API Key System

### Creating API Keys

```typescript
// lib/ai-api/api-key-manager.ts
import { createApiKey } from '@/lib/ai-api/api-key-manager';

const result = await createApiKey(userId, 'My API Key', {
  rateLimitPerMinute: 60,
  rateLimitPerDay: 1000,
  expiresAt: new Date('2025-12-31'),
});

console.log(result.apiKey); // pp_live-abc123... (shown ONCE)
console.log(result.keyPrefix); // pp_live-abc123x
```

### Format
- `pp_live-` prefix (8 chars)
- 32 random characters (base64url)
- Total: 40 characters
- Example: `pp_live-xY4kB2nL9pQw3vR8sT1mN6jH5gF7dC0e`

### Security
- Full keys **never stored** in database
- Only bcrypt hashes stored (`key_hash`)
- Prefix stored for display (`key_prefix`)
- Keys shown only once during creation

---

## 💰 Wallet & Credits

### Wallet Creation

Wallets are automatically created when:
1. User first creates an API key
2. User first receives credits
3. Admin action triggers wallet creation

```typescript
import { getOrCreateWallet, getWalletBalance } from '@/lib/ai-api/wallet-manager';

const wallet = await getOrCreateWallet(userId);
const balance = await getWalletBalance(userId);
console.log(`Balance: $${balance}`);
```

### Credit Operations

#### Add Credits (Top-up, Bonus, Refund)
```typescript
import { addCredits } from '@/lib/ai-api/wallet-manager';

await addCredits(
  userId,
  10.00, // Amount in USD
  'topup', // Type: topup, bonus, refund, adjustment
  'Stripe payment: xyz123',
  { stripe_session_id: 'cs_xxx' } // Optional metadata
);
```

#### Deduct Credits (Usage)
```typescript
import { deductCredits } from '@/lib/ai-api/wallet-manager';

const result = await deductCredits(
  userId,
  0.05, // Amount
  'AI API usage: pipilot-1-chat',
  { model: 'pipilot-1-chat', tokens: 1000 }
);

if (result.success) {
  console.log(`New balance: $${result.newBalance}`);
} else {
  console.log('Insufficient balance!');
}
```

---

## 📊 Billing & Usage Tracking

### Token Counting

```typescript
import { estimateTokenCount, estimateMessagesTokenCount } from '@/lib/ai-api/billing-manager';

const tokens = estimateTokenCount('Hello, world!');
const messageTokens = estimateMessagesTokenCount([
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi there!' },
]);
```

### Cost Calculation

```typescript
import { calculateCost } from '@/lib/ai-api/billing-manager';

const cost = await calculateCost(
  'pipilot-1-chat',
  500, // Input tokens
  300  // Output tokens
);
console.log(`Cost: $${cost.toFixed(4)}`);
```

### Usage Logging

```typescript
import { logUsage } from '@/lib/ai-api/billing-manager';

await logUsage({
  userId,
  apiKeyId,
  walletId,
  model: 'pipilot-1-chat',
  endpoint: '/v1/chat/completions',
  inputTokens: 500,
  outputTokens: 300,
  cost: 0.05,
  statusCode: 200,
  responseTimeMs: 1234,
});
```

### Rate Limiting

```typescript
import { checkRateLimit } from '@/lib/ai-api/billing-manager';

const check = await checkRateLimit(apiKeyId, 60, 1000);
if (!check.allowed) {
  console.log(check.reason); // "Rate limit exceeded: 60 requests per minute"
}
```

---

## 💳 Stripe Integration

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://pipilot.dev
```

### Checkout Flow

1. **Create Checkout Session**
```bash
POST /api/ai-api/stripe/checkout
Authorization: Bearer <supabase_token>
Content-Type: application/json

{
  "amount": 10.00
}
```

Response:
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

2. **User Completes Payment** → Redirect to `success_url`

3. **Webhook Receives Event** → Credits Added Automatically

### Webhook Handler

Located at: `/api/ai-api/stripe/webhook`

Handles:
- `checkout.session.completed` → Add credits
- `payment_intent.succeeded` → Log success
- `payment_intent.payment_failed` → Log failure

### Setup Webhook in Stripe

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/ai-api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 🛠️ Admin Tools

### Admin User Configuration

```env
ADMIN_USER_IDS=user-uuid-1,user-uuid-2,user-uuid-3
```

### Send Bonus Credits

```bash
POST /api/ai-api/admin/credits/bonus
Authorization: Bearer <admin_supabase_token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "amount": 50.00,
  "description": "Welcome bonus"
}
```

### Set Wallet Balance

```bash
POST /api/ai-api/admin/credits/set
Authorization: Bearer <admin_supabase_token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "balance": 100.00,
  "description": "Manual adjustment"
}
```

---

## 🌐 API Endpoints

### User Endpoints

#### List API Keys
```bash
GET /api/ai-api/keys
Authorization: Bearer <supabase_token>
```

Response:
```json
{
  "success": true,
  "keys": [
    {
      "id": "uuid",
      "key_prefix": "pp_live-xxxx",
      "name": "My API Key",
      "rate_limit_per_minute": 60,
      "rate_limit_per_day": 1000,
      "is_active": true,
      "last_used_at": "2025-01-01T00:00:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Create API Key
```bash
POST /api/ai-api/keys
Authorization: Bearer <supabase_token>
Content-Type: application/json

{
  "name": "Production Key",
  "rateLimitPerMinute": 120,
  "rateLimitPerDay": 5000
}
```

Response:
```json
{
  "success": true,
  "apiKey": "pp_live-abc123...",
  "keyPrefix": "pp_live-abc123x",
  "id": "uuid",
  "warning": "Save this API key securely. You will not be able to see it again."
}
```

#### Delete API Key
```bash
DELETE /api/ai-api/keys
Authorization: Bearer <supabase_token>
Content-Type: application/json

{
  "keyId": "uuid"
}
```

#### Get Wallet Info
```bash
GET /api/ai-api/wallet
Authorization: Bearer <supabase_token>
```

Response:
```json
{
  "success": true,
  "wallet": {
    "id": "uuid",
    "balance": 45.67,
    "currency": "USD",
    "stripeCustomerId": "cus_xxx"
  },
  "transactions": [...],
  "usageStats": {
    "totalRequests": 100,
    "totalTokens": 50000,
    "totalCost": 4.33,
    "byModel": {...}
  }
}
```

### AI API Endpoint

#### Chat Completions (OpenAI-Compatible)
```bash
POST /api/v1/chat/completions
Authorization: Bearer pp_live-abc123...
Content-Type: application/json

{
  "model": "pipilot-1-chat",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Authentication Flow:**
1. Validate API key
2. Check rate limits
3. Check wallet balance (minimum $0.01)
4. Process request
5. Calculate cost
6. Deduct from wallet
7. Log usage

---

## 📝 Example Usage

### Complete Integration Example

```javascript
// 1. User authenticates with Supabase
const { data: { session } } = await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password'
});

// 2. Create API key
const createKeyResponse = await fetch('/api/ai-api/keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My First Key',
    rateLimitPerMinute: 60,
    rateLimitPerDay: 1000,
  }),
});

const { apiKey } = await createKeyResponse.json();
console.log('Save this key:', apiKey);

// 3. Top up wallet via Stripe
const checkoutResponse = await fetch('/api/ai-api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ amount: 10.00 }),
});

const { url } = await checkoutResponse.json();
window.location.href = url; // Redirect to Stripe checkout

// 4. After payment, use AI API
const aiResponse = await fetch('/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`, // Use AI API key
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'pipilot-1-chat',
    messages: [
      { role: 'user', content: 'Hello, AI!' }
    ],
  }),
});

const completion = await aiResponse.json();
console.log(completion.choices[0].message.content);

// 5. Check wallet balance
const walletResponse = await fetch('/api/ai-api/wallet', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

const { wallet } = await walletResponse.json();
console.log(`Remaining balance: $${wallet.balance}`);
```

---

## 🔒 Security Best Practices

1. **API Keys**
   - Never commit API keys to version control
   - Use environment variables for keys
   - Rotate keys regularly
   - Deactivate compromised keys immediately

2. **Webhook Signatures**
   - Always verify Stripe webhook signatures
   - Use `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard

3. **Admin Endpoints**
   - Restrict admin user IDs in environment variables
   - Add additional auth layers if needed
   - Log all admin actions

4. **Rate Limiting**
   - Set appropriate limits per API key
   - Monitor for abuse patterns
   - Implement IP-based rate limiting if needed

---

## 📈 Monitoring & Analytics

### Usage Statistics

```typescript
import { getUsageStats } from '@/lib/ai-api/billing-manager';

const stats = await getUsageStats(userId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  model: 'pipilot-1-chat',
});

console.log(stats);
// {
//   totalRequests: 1000,
//   totalTokens: 500000,
//   totalCost: 25.50,
//   byModel: {...},
//   logs: [...]
// }
```

### Transaction History

```typescript
import { getTransactions } from '@/lib/ai-api/wallet-manager';

const transactions = await getTransactions(userId, {
  limit: 50,
  offset: 0,
});
```

---

## 🚀 Deployment Checklist

- [ ] Set environment variables in production
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `ADMIN_USER_IDS`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

- [ ] Run database migrations
  - `create_ai_api_monetization_tables` migration applied

- [ ] Configure Stripe webhook endpoint
  - Endpoint: `https://yourdomain.com/api/ai-api/stripe/webhook`
  - Events: `checkout.session.completed`

- [ ] Test API key creation and validation

- [ ] Test wallet top-up flow with Stripe (test mode)

- [ ] Test AI API endpoint with authentication

- [ ] Verify billing and usage logging

- [ ] Set up monitoring and alerts

---

## 📞 Support

For issues or questions:
- Check logs in Supabase Dashboard
- Review Stripe webhook logs
- Check API usage logs in `ai_usage_logs` table
- Review transaction history in `ai_transactions` table

---

**Built with ❤️ by PiPilot Team**

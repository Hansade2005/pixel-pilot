# 🚀 AI API Monetization - Quick Setup Guide

## Prerequisites

- Supabase project configured
- Stripe account
- Environment variables set

---

## 📋 Step-by-Step Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Users (comma-separated UUIDs)
ADMIN_USER_IDS=user-uuid-1,user-uuid-2
```

### 2. Database Migration

The migration has already been applied! ✅

Tables created:
- `ai_wallets`
- `ai_api_keys`
- `ai_transactions`
- `ai_usage_logs`
- `ai_pricing`

To verify, run:
```bash
# Check if tables exist
npm run test:supabase
```

### 3. Stripe Webhook Setup

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)

2. Click **Add endpoint**

3. Enter endpoint URL:
   ```
   https://yourdomain.com/api/ai-api/stripe/webhook
   ```
   
   For local testing with Stripe CLI:
   ```
   http://localhost:3000/api/ai-api/stripe/webhook
   ```

4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_`)

6. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
   ```

### 4. Test with Stripe CLI (Local Development)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli#install

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/ai-api/stripe/webhook

# This will output a webhook signing secret
# Copy it to STRIPE_WEBHOOK_SECRET in .env.local
```

### 5. Test the System

```bash
# Run the test script
node test-ai-api-monetization.js
```

**Before running:**
1. Get a user ID from Supabase Dashboard → Authentication → Users
2. Edit `test-ai-api-monetization.js`
3. Replace `TEST_USER_ID` with actual UUID

---

## 🧪 Testing the Complete Flow

### A. Create API Key via API

```bash
# 1. Get Supabase auth token (login first)
curl -X POST https://your-project.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Save the access_token from response

# 2. Create API key
curl -X POST http://localhost:3000/api/ai-api/keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Key",
    "rateLimitPerMinute": 60,
    "rateLimitPerDay": 1000
  }'

# Save the apiKey from response (pp_live-...)
```

### B. Top Up Wallet

```bash
# Create Stripe checkout session
curl -X POST http://localhost:3000/api/ai-api/stripe/checkout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00
  }'

# Visit the returned URL to complete payment
# After payment, credits are automatically added
```

### C. Use AI API

```bash
# Make a request with your API key
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer pp_live-YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "pipilot-1-chat",
    "messages": [
      {"role": "user", "content": "Hello, AI!"}
    ]
  }'

# Response will include the AI's reply
# Your wallet will be automatically charged
```

### D. Check Wallet Balance

```bash
curl -X GET http://localhost:3000/api/ai-api/wallet \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🛠️ Admin Commands

### Give User Bonus Credits

```bash
curl -X POST http://localhost:3000/api/ai-api/admin/credits/bonus \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "amount": 50.00,
    "description": "Welcome bonus"
  }'
```

### Set User Balance

```bash
curl -X POST http://localhost:3000/api/ai-api/admin/credits/set \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "balance": 100.00,
    "description": "Manual adjustment"
  }'
```

---

## 📊 Monitoring

### View Usage Logs

Query the `ai_usage_logs` table in Supabase:

```sql
SELECT 
  model,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost) as total_cost
FROM ai_usage_logs
WHERE user_id = 'your-user-uuid'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY total_cost DESC;
```

### View Transactions

```sql
SELECT 
  type,
  amount,
  description,
  balance_after,
  created_at
FROM ai_transactions
WHERE user_id = 'your-user-uuid'
ORDER BY created_at DESC
LIMIT 20;
```

### Check API Key Usage

```sql
SELECT 
  key_prefix,
  name,
  last_used_at,
  is_active,
  (
    SELECT COUNT(*) 
    FROM ai_usage_logs 
    WHERE api_key_id = ai_api_keys.id
  ) as total_requests
FROM ai_api_keys
WHERE user_id = 'your-user-uuid'
ORDER BY last_used_at DESC;
```

---

## 🐛 Troubleshooting

### API Key Not Working

1. Check if key is active:
   ```sql
   SELECT * FROM ai_api_keys WHERE key_prefix = 'pp_live-xxxxx';
   ```

2. Verify key format: `pp_live-` followed by 32 characters

3. Check Authorization header format: `Bearer pp_live-...`

### Insufficient Balance Error

1. Check wallet balance:
   ```sql
   SELECT * FROM ai_wallets WHERE user_id = 'your-user-uuid';
   ```

2. Add test credits (admin):
   ```bash
   curl -X POST http://localhost:3000/api/ai-api/admin/credits/bonus \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"userId": "user-uuid", "amount": 10.00, "description": "Test"}'
   ```

### Stripe Webhook Not Working

1. Check webhook signature in logs

2. Verify `STRIPE_WEBHOOK_SECRET` is correct

3. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/ai-api/stripe/webhook
   ```

4. Trigger test webhook:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Rate Limit Errors

1. Check API key rate limits:
   ```sql
   SELECT 
     key_prefix,
     rate_limit_per_minute,
     rate_limit_per_day
   FROM ai_api_keys
   WHERE key_prefix = 'pp_live-xxxxx';
   ```

2. View recent usage:
   ```sql
   SELECT 
     COUNT(*) as requests_last_minute
   FROM ai_usage_logs
   WHERE api_key_id = 'key-uuid'
     AND created_at >= NOW() - INTERVAL '1 minute';
   ```

---

## 📱 Frontend Integration Example

```typescript
// components/ai-api-dashboard.tsx
import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

export default function AIAPIDashboard() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchApiKeys();
    }
  }, [user]);

  async function fetchWallet() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/ai-api/wallet', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    const data = await response.json();
    setWallet(data.wallet);
  }

  async function fetchApiKeys() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/ai-api/keys', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    const data = await response.json();
    setApiKeys(data.keys);
  }

  async function createApiKey() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/ai-api/keys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New API Key',
        rateLimitPerMinute: 60,
        rateLimitPerDay: 1000,
      }),
    });
    
    const data = await response.json();
    alert(`Your API key: ${data.apiKey}\n\nSave it securely!`);
    fetchApiKeys();
  }

  async function topUpWallet(amount: number) {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/ai-api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    
    const data = await response.json();
    window.location.href = data.url; // Redirect to Stripe
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI API Dashboard</h1>
      
      {/* Wallet */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Wallet</h2>
        {wallet && (
          <div>
            <p className="text-3xl font-bold">${wallet.balance.toFixed(2)}</p>
            <button 
              onClick={() => topUpWallet(10)}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add $10
            </button>
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">API Keys</h2>
          <button 
            onClick={createApiKey}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Create New Key
          </button>
        </div>
        <div className="space-y-2">
          {apiKeys.map(key => (
            <div key={key.id} className="border p-3 rounded">
              <p className="font-mono text-sm">{key.key_prefix}***</p>
              <p className="text-gray-600 text-sm">{key.name}</p>
              <p className="text-xs text-gray-500">
                Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Checklist

- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Stripe webhook configured
- [ ] Admin user IDs set
- [ ] Test script executed successfully
- [ ] First API key created
- [ ] Wallet topped up with test funds
- [ ] AI API request tested
- [ ] Usage logged correctly
- [ ] Billing working properly

---

**Ready to monetize! 🚀**

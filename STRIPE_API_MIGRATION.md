# Stripe API Routes - Updated Pattern

## ✅ Updated Routes (Following Supabase Pattern)

All Stripe API routes now accept `stripeKey` directly in the request body, matching the Supabase API pattern.

### Updated Routes:
1. ✅ `/api/stripe/account` - POST only, requires `stripeKey` in body
2. ✅ `/api/stripe/balance` - POST only, requires `stripeKey` in body  
3. ✅ `/api/stripe/validate` - POST only, requires `stripeKey` in body
4. ✅ `/api/stripe/customers` - POST only, uses `action` parameter
5. ✅ `/api/stripe/products` - POST only, uses `action` parameter
6. ✅ `/api/stripe/prices` - POST only, uses `action` parameter
7. ✅ `/api/stripe/subscriptions` - POST only, uses `action` parameter

### Routes Still Need Update:
- `/api/stripe/payment-intents`
- `/api/stripe/invoices`
- `/api/stripe/payment-links`
- `/api/stripe/charges`
- `/api/stripe/refunds`
- `/api/stripe/coupons`
- `/api/stripe/search`

## 📝 New Request Format

### Before (Authentication-based):
```typescript
// Required Authorization header
headers: {
  'Authorization': 'Bearer SUPABASE_JWT_TOKEN'
}
GET /api/stripe/customers?limit=10
```

### After (Key-based, like Supabase):
```typescript
// No authorization header needed
POST /api/stripe/customers
Body: {
  "stripeKey": "sk_test_xxx",
  "limit": 10
}
```

## 🎯 Action Parameter Pattern

For operations that support both list and create:

```typescript
// List items
POST /api/stripe/customers
{
  "stripeKey": "sk_test_xxx",
  "limit": 10
}

// Create item
POST /api/stripe/customers
{
  "stripeKey": "sk_test_xxx",
  "action": "create",
  "email": "customer@example.com",
  "name": "John Doe"
}
```

## 🔄 Migration Guide

### For AI Agents / Frontend Code:

**Old way:**
```typescript
const response = await fetch('/api/stripe/customers', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
})
```

**New way:**
```typescript
const response = await fetch('/api/stripe/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stripeKey: userStripeKey,
    limit: 10
  })
})
```

## 📚 Complete Examples

### Get Account Info
```typescript
POST /api/stripe/account
{
  "stripeKey": "sk_test_xxx"
}
```

### Get Balance
```typescript
POST /api/stripe/balance
{
  "stripeKey": "sk_test_xxx"
}
```

### Validate Key
```typescript
POST /api/stripe/validate
{
  "stripeKey": "sk_test_xxx"
}
```

### List Customers
```typescript
POST /api/stripe/customers
{
  "stripeKey": "sk_test_xxx",
  "limit": 20,
  "email": "search@example.com"
}
```

### Create Customer
```typescript
POST /api/stripe/customers
{
  "stripeKey": "sk_test_xxx",
  "action": "create",
  "email": "new@example.com",
  "name": "New Customer",
  "metadata": { "user_id": "123" }
}
```

### List Products
```typescript
POST /api/stripe/products
{
  "stripeKey": "sk_test_xxx",
  "active": true,
  "limit": 10
}
```

### Create Product
```typescript
POST /api/stripe/products
{
  "stripeKey": "sk_test_xxx",
  "action": "create",
  "name": "Premium Plan",
  "description": "Full access",
  "default_price_data": {
    "currency": "usd",
    "unit_amount": 2999
  }
}
```

### Create Price
```typescript
POST /api/stripe/prices
{
  "stripeKey": "sk_test_xxx",
  "action": "create",
  "product": "prod_xxx",
  "currency": "usd",
  "unit_amount": 2999,
  "recurring": {
    "interval": "month"
  }
}
```

### Create Subscription
```typescript
POST /api/stripe/subscriptions
{
  "stripeKey": "sk_test_xxx",
  "action": "create",
  "customer": "cus_xxx",
  "items": [
    {
      "price": "price_xxx",
      "quantity": 1
    }
  ]
}
```

## 🎉 Benefits

1. **Consistency** - Matches Supabase API pattern exactly
2. **Simplicity** - No authentication flow needed
3. **Flexibility** - Users can switch between different Stripe accounts easily
4. **Direct** - Straight to the point, just like Supabase routes
5. **AI-Friendly** - Perfect for AI agents that have the Stripe key

## ⚠️ Security Note

The `stripeKey` should be:
- Stored securely (encrypted in database)
- Never exposed to client-side code
- Only sent from secure server-to-server calls
- Obtained through Stripe Connect flow

This matches how Supabase tokens are handled in the current system.

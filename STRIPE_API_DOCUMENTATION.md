# Stripe Management API

A comprehensive custom Stripe API implementation for PiPilot, built using Stripe Connect's existing authentication system. This provides direct access to Stripe's management API without relying on MCP servers.

## 🎯 Overview

This custom API system mirrors the Supabase API architecture, providing a consistent interface for managing Stripe resources through your connected Stripe accounts.

## 🔐 Authentication

All endpoints require authentication via Supabase JWT token:

```typescript
headers: {
  'Authorization': 'Bearer YOUR_SUPABASE_JWT_TOKEN'
}
```

The system automatically:
1. Validates your Supabase session
2. Retrieves your connected Stripe access token
3. Executes operations on your behalf

## 📋 Available Endpoints

### Account Management

#### `GET /api/stripe/account`
Get Stripe account information.

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acct_xxx",
      "business_type": "individual",
      "charges_enabled": true,
      "country": "US",
      "email": "user@example.com",
      ...
    }
  }
}
```

#### `GET /api/stripe/balance`
Get current account balance.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "available": [{ "amount": 10000, "currency": "usd" }],
      "pending": [{ "amount": 5000, "currency": "usd" }]
    }
  }
}
```

#### `POST /api/stripe/validate`
Validate a Stripe API key.

**Request:**
```json
{
  "apiKey": "sk_test_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "account": { ... }
  }
}
```

---

### Customers

#### `GET /api/stripe/customers`
List customers with optional filtering.

**Query Parameters:**
- `limit` (number, max 100, default 10)
- `starting_after` (string, pagination cursor)
- `email` (string, filter by email)

**Example:**
```
GET /api/stripe/customers?limit=20&email=john@example.com
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [...],
    "has_more": false,
    "total_count": 2
  }
}
```

#### `POST /api/stripe/customers`
Create a new customer.

**Request:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "description": "Premium customer",
  "metadata": {
    "user_id": "123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": { ... }
  }
}
```

---

### Products

#### `GET /api/stripe/products`
List products.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `active` (boolean, filter by active status)

#### `POST /api/stripe/products`
Create a new product.

**Request:**
```json
{
  "name": "Premium Plan",
  "description": "Access to all premium features",
  "active": true,
  "metadata": {
    "plan_tier": "premium"
  },
  "default_price_data": {
    "currency": "usd",
    "unit_amount": 2999
  }
}
```

---

### Prices

#### `GET /api/stripe/prices`
List prices.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `product` (string, filter by product ID)
- `active` (boolean)

#### `POST /api/stripe/prices`
Create a new price.

**Request:**
```json
{
  "product": "prod_xxx",
  "currency": "usd",
  "unit_amount": 2999,
  "recurring": {
    "interval": "month",
    "interval_count": 1
  },
  "metadata": {
    "tier": "premium"
  }
}
```

---

### Subscriptions

#### `GET /api/stripe/subscriptions`
List subscriptions.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `customer` (string, filter by customer ID)
- `price` (string, filter by price ID)
- `status` (string, filter by status: active, canceled, incomplete, etc.)

#### `POST /api/stripe/subscriptions`
Create a new subscription.

**Request:**
```json
{
  "customer": "cus_xxx",
  "items": [
    {
      "price": "price_xxx",
      "quantity": 1
    }
  ],
  "payment_behavior": "default_incomplete",
  "metadata": {
    "order_id": "12345"
  }
}
```

---

### Payment Intents

#### `GET /api/stripe/payment-intents`
List payment intents.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `customer` (string)

#### `POST /api/stripe/payment-intents`
Create a new payment intent.

**Request:**
```json
{
  "amount": 2999,
  "currency": "usd",
  "customer": "cus_xxx",
  "description": "Payment for order #12345",
  "payment_method_types": ["card"],
  "metadata": {
    "order_id": "12345"
  }
}
```

---

### Invoices

#### `GET /api/stripe/invoices`
List invoices.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `customer` (string)
- `status` (string: draft, open, paid, uncollectible, void)

#### `POST /api/stripe/invoices`
Create a new invoice.

**Request:**
```json
{
  "customer": "cus_xxx",
  "auto_advance": true,
  "collection_method": "send_invoice",
  "description": "Monthly subscription",
  "metadata": {
    "order_id": "12345"
  }
}
```

---

### Payment Links

#### `GET /api/stripe/payment-links`
List payment links.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)

#### `POST /api/stripe/payment-links`
Create a payment link.

**Request:**
```json
{
  "line_items": [
    {
      "price": "price_xxx",
      "quantity": 1
    }
  ],
  "after_completion": {
    "type": "redirect",
    "redirect": {
      "url": "https://example.com/success"
    }
  },
  "metadata": {
    "campaign": "summer_sale"
  }
}
```

---

### Charges

#### `GET /api/stripe/charges`
List charges.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `customer` (string)

---

### Refunds

#### `GET /api/stripe/refunds`
List refunds.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)
- `charge` (string)

#### `POST /api/stripe/refunds`
Create a refund.

**Request:**
```json
{
  "charge": "ch_xxx",
  "amount": 1000,
  "reason": "requested_by_customer",
  "metadata": {
    "refund_reason": "Product not as described"
  }
}
```

---

### Coupons

#### `GET /api/stripe/coupons`
List coupons.

**Query Parameters:**
- `limit` (number)
- `starting_after` (string)

#### `POST /api/stripe/coupons`
Create a coupon.

**Request:**
```json
{
  "duration": "repeating",
  "duration_in_months": 3,
  "percent_off": 25,
  "name": "Summer Sale",
  "metadata": {
    "campaign": "summer_2024"
  }
}
```

---

### Search

#### `POST /api/stripe/search`
Search across Stripe resources using Stripe's query syntax.

**Request:**
```json
{
  "resource": "customers",
  "query": "email:'john@example.com'",
  "limit": 10
}
```

**Supported Resources:**
- `customers`
- `products`
- `prices`
- `subscriptions`
- `invoices`
- `payment_intents`
- `charges`

**Example Queries:**
```javascript
// Find customer by email
{ resource: "customers", query: "email:'customer@example.com'" }

// Find active products with name containing "shirt"
{ resource: "products", query: "active:'true' AND name~'shirt'" }

// Find paid invoices over $100
{ resource: "invoices", query: "status:'paid' AND total>10000" }

// Find subscriptions by status
{ resource: "subscriptions", query: "status:'active'" }
```

---

## 💡 Usage Examples

### TypeScript/JavaScript Client

```typescript
// Base setup
const STRIPE_API_BASE = '/api/stripe'
const authToken = 'your-supabase-jwt-token'

const headers = {
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
}

// List customers
const listCustomers = async () => {
  const response = await fetch(`${STRIPE_API_BASE}/customers?limit=20`, {
    headers
  })
  const data = await response.json()
  return data.data.customers
}

// Create a product
const createProduct = async () => {
  const response = await fetch(`${STRIPE_API_BASE}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Premium Subscription',
      description: 'Access to all features',
      default_price_data: {
        currency: 'usd',
        unit_amount: 2999
      }
    })
  })
  const data = await response.json()
  return data.data.product
}

// Create a payment intent
const createPaymentIntent = async (amount: number, currency: string) => {
  const response = await fetch(`${STRIPE_API_BASE}/payment-intents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount,
      currency,
      payment_method_types: ['card']
    })
  })
  const data = await response.json()
  return data.data.payment_intent
}

// Search for customers
const searchCustomers = async (email: string) => {
  const response = await fetch(`${STRIPE_API_BASE}/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resource: 'customers',
      query: `email:'${email}'`
    })
  })
  const data = await response.json()
  return data.data.results
}

// Get account balance
const getBalance = async () => {
  const response = await fetch(`${STRIPE_API_BASE}/balance`, {
    headers
  })
  const data = await response.json()
  return data.data.balance
}
```

---

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "success": false
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid auth token)
- `403` - Forbidden (Stripe account not connected)
- `500` - Internal Server Error

---

## 🛠️ Architecture

### File Structure

```
app/api/stripe/
├── account/route.ts          # Account info
├── balance/route.ts          # Balance retrieval
├── charges/route.ts          # Charge operations
├── coupons/route.ts          # Coupon management
├── customers/route.ts        # Customer CRUD
├── invoices/route.ts         # Invoice operations
├── payment-intents/route.ts  # Payment intent management
├── payment-links/route.ts    # Payment link creation
├── prices/route.ts           # Price management
├── products/route.ts         # Product CRUD
├── refunds/route.ts          # Refund operations
├── search/route.ts           # Search functionality
├── subscriptions/route.ts    # Subscription management
└── validate/route.ts         # API key validation

lib/stripe/
└── stripe-api-utils.ts       # Shared utilities
```

### Utility Functions

**`lib/stripe/stripe-api-utils.ts`** provides:
- `createStripeClient(apiKey)` - Initialize Stripe client
- `validateStripeKey(apiKey)` - Validate API key
- `getStripeAccessToken(userId)` - Get user's Stripe token from Supabase
- `createErrorResponse(message, status)` - Format error responses
- `createSuccessResponse(data, status)` - Format success responses
- `extractAuthToken(request)` - Extract JWT from headers
- `handleStripeError(error)` - Handle Stripe API errors
- `getPaginationParams(limit, startingAfter)` - Build pagination params
- `formatAmount(amount, currency)` - Format cents to currency
- `amountToCents(amount, currency)` - Convert to cents
- `sanitizeStripeObject(obj)` - Remove sensitive fields
- `normalizeStripeError(error)` - User-friendly error messages

---

## ✅ Benefits Over MCP

1. **No External Dependencies** - Uses existing Stripe Connect system
2. **Better Performance** - Direct API calls without MCP overhead
3. **Consistent Architecture** - Matches Supabase API structure
4. **Full Type Safety** - TypeScript throughout
5. **Better Error Handling** - Consistent error responses
6. **More Control** - Custom logic and validation
7. **Easier Debugging** - Standard Next.js API routes

---

## 🚀 Next Steps

### AI Integration
These endpoints can be called by AI agents to manage Stripe operations:

```typescript
// Example: AI creates a product and price
const product = await createProduct()
const price = await createPrice(product.id, 2999, 'usd')
const paymentLink = await createPaymentLink(price.id)
```

### Future Enhancements
- [ ] Webhook handling endpoints
- [ ] Checkout session management
- [ ] Subscription lifecycle management
- [ ] Dispute handling
- [ ] Payout operations
- [ ] Tax calculation
- [ ] Shipping rate management
- [ ] Promotion code system

---

## 📚 Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Search Query Syntax](https://stripe.com/docs/search)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## 🎉 Success!

Your custom Stripe Management API is now ready to use! All endpoints are authenticated, secure, and ready for integration with your AI agents or frontend applications.

**Boss approval status**: ✅ SHIPPED! 🚀

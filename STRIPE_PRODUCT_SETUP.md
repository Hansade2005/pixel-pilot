# 🚀 Stripe Products & Pricing Setup Guide

## **Method 1: Automated Script (Recommended)**

### **Run the Script:**

```bash
# Set your Stripe secret key as environment variable
export STRIPE_SECRET_KEY=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

# Run the script
node scripts/create-stripe-products.js
```

**Expected Output:**
```
🚀 Creating Stripe Products and Prices...

📦 Creating product: Pixel Pilot Pro
✅ Product created: prod_xxxxxxxxxxxxxxxxxx
💰 Monthly price created: price_xxxxxxxxxxxxxxxxxx - $15/month
💰 Yearly price created: price_xxxxxxxxxxxxxxxxxx - $180/year
💸 Savings: 20% off when billed annually

📦 Creating product: Pixel Pilot Teams
✅ Product created: prod_xxxxxxxxxxxxxxxxxx
💰 Monthly price created: price_xxxxxxxxxxxxxxxxxx - $30/month
💰 Yearly price created: price_xxxxxxxxxxxxxxxxxx - $360/year
💸 Savings: 20% off when billed annually

📦 Creating product: Pixel Pilot Enterprise
✅ Product created: prod_xxxxxxxxxxxxxxxxxx
💰 Monthly price created: price_xxxxxxxxxxxxxxxxxx - $60/month
💰 Yearly price created: price_xxxxxxxxxxxxxxxxxx - $720/year
💸 Savings: 20% off when billed annually

🎉 All products and prices created successfully!

📋 Price IDs for your environment variables:

NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY=price_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_YEARLY=price_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxxxxxxxxxxxxxxx
```

## **Method 2: Manual Setup in Stripe Dashboard**

If you prefer to create products manually in the Stripe Dashboard:

### **Step 1: Create Pro Plan**

1. **Go to**: [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. **Click**: "Create Product"
3. **Product Details**:
   - **Name**: `Pixel Pilot Pro`
   - **Description**: `Perfect for individual developers and small teams`

#### **Monthly Price:**
- **Price**: `$15.00`
- **Currency**: `USD`
- **Billing period**: `Monthly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY`

#### **Yearly Price:**
- **Price**: `$180.00`
- **Currency**: `USD`
- **Billing period**: `Yearly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY`

### **Step 2: Create Teams Plan**

1. **Click**: "Create Product"
2. **Product Details**:
   - **Name**: `Pixel Pilot Teams`
   - **Description**: `Advanced collaboration tools for growing teams`

#### **Monthly Price:**
- **Price**: `$30.00`
- **Currency**: `USD`
- **Billing period**: `Monthly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY`

#### **Yearly Price:**
- **Price**: `$360.00`
- **Currency**: `USD`
- **Billing period**: `Yearly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_TEAMS_YEARLY`

### **Step 3: Create Enterprise Plan**

1. **Click**: "Create Product"
2. **Product Details**:
   - **Name**: `Pixel Pilot Enterprise`
   - **Description**: `Complete solution for large organizations`

#### **Monthly Price:**
- **Price**: `$60.00`
- **Currency**: `USD`
- **Billing period**: `Monthly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY`

#### **Yearly Price:**
- **Price**: `$720.00`
- **Currency**: `USD`
- **Billing period**: `Yearly`
- **Copy Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY`

## **📝 Environment Variables Setup**

After creating the products, add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51MiyfiIgnyjJWA40UIlAv7c1KShr87YpPFwXNpEz3jkY2nFKxnfO3Tqj4iWOtX273kuU32RdHXwmUkaN8KZ5nZYz003NuUhqRs

# Stripe Price IDs (from script output or manual creation)
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_your_yearly_price_id
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_YEARLY=price_your_yearly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY=price_your_yearly_price_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://pipilot.dev
```

## **🎯 Pricing Structure**

| Plan | Monthly | Yearly | Savings |
|------|---------|--------|---------|
| **Pro** | $15/month | $180/year | **20% off** |
| **Teams** | $30/month | $360/year | **20% off** |
| **Enterprise** | $60/month | $720/year | **20% off** |

## **✅ Features by Plan**

### **Pro Plan ($15/month or $180/year)**
- ✅ Everything in Free
- ✅ 500 prompt credits/month
- ✅ All premium models (OpenAI, Claude, Gemini, xAI)
- ✅ SWE-1 model (0 credits)
- ✅ Advanced project management
- ✅ Add-on credits at $10/250 credits
- ✅ Optional zero data retention
- ✅ Unlimited Fast Tab & Command
- ✅ Real-time previews
- ✅ 1 App Deploy/day
- ✅ Priority support
- ✅ Custom project templates

### **Teams Plan ($30/month or $360/year)**
- ✅ Everything in Pro
- ✅ 500 prompt credits/user/month
- ✅ Team project collaboration
- ✅ Shared project workspaces
- ✅ Add-on credits at $40/1000 credits
- ✅ Centralized billing & admin dashboard
- ✅ Advanced analytics & reporting
- ✅ Automated zero data retention
- ✅ SSO available for +$10/user/month
- ✅ 5 App Deploys/day
- ✅ Role-based project permissions
- ✅ Team code reviews & feedback

### **Enterprise Plan ($60/month or $720/year)**
- ✅ Everything in Teams
- ✅ 1,000 prompt credits/user/month
- ✅ Enterprise project portfolio management
- ✅ Multi-organization support
- ✅ Add-on credits at $40/1000 credits
- ✅ Full RBAC & advanced permissions
- ✅ SSO + enterprise access control
- ✅ Volume discounts (>200 seats)
- ✅ Dedicated account management
- ✅ Hybrid & on-premise deployment
- ✅ Custom integrations & APIs
- ✅ Advanced security & compliance
- ✅ 24/7 premium support
- ✅ Custom project workflows

## **🧪 Test the Integration**

1. **Set environment variables** with your price IDs
2. **Start your app**: `npm run dev`
3. **Visit**: `https://pipilot.dev/pricing`
4. **Test both billing options**:
   - Toggle between Monthly/Yearly
   - Click Pro/Teams plans
   - Complete checkout flow
   - Verify subscription creation

## **🔍 Verify Setup**

Check your Stripe Dashboard:
- **Products**: Should show 3 products (Pro, Teams, Enterprise)
- **Prices**: Each product should have 2 prices (monthly + yearly)
- **Test a subscription**: Create a test subscription to verify pricing

## **🎉 Ready to Launch!**

Once you have:
- ✅ Created all products and prices
- ✅ Set environment variables
- ✅ Tested the checkout flow
- ✅ Verified subscription creation

Your **Pixel Pilot subscription system** with monthly/yearly billing is ready for production! 🚀

**Need help?** Check the Stripe Dashboard or run the script again with a fresh API key.

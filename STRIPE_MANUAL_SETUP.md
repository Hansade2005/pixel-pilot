# 🚀 Stripe Product Setup Guide (Manual)

Since our API key is expired, here's how to manually create your products in Stripe and configure them in your application.

## **1. Create Products in Stripe Dashboard**

Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Products** → **Create product**

### **Product 1: PiPilot Pro**
```
Product name: PiPilot Pro
Description: Perfect for individual developers and small teams
```

**Create two prices:**
- **Monthly**: $15.00 USD/month → Copy `Price ID`
- **Yearly**: $180.00 USD/year → Copy `Price ID`

### **Product 2: PiPilot Teams**
```
Product name: PiPilot Teams
Description: Advanced collaboration tools for growing teams
```

**Create two prices:**
- **Monthly**: $30.00 USD/month → Copy `Price ID`
- **Yearly**: $360.00 USD/year → Copy `Price ID`

### **Product 3: PiPilot Enterprise**
```
Product name: PiPilot Enterprise
Description: Complete solution for large organizations
```

**Create two prices:**
- **Monthly**: $60.00 USD/month → Copy `Price ID`
- **Yearly**: $720.00 USD/year → Copy `Price ID`

## **2. Update Environment Variables**

Add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51MiyfiIgnyjJWA40UIlAv7c1KShr87YpPFwXNpEz3jkY2nFKxnfO3Tqj4iWOtX273kuU32RdHXwmUkaN8KJZ5nZYz003NuUhqRs

# Price IDs from Stripe (replace with actual IDs)
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY=price_YOUR_TEAMS_MONTHLY_ID
NEXT_PUBLIC_STRIPE_PRICE_TEAMS_YEARLY=price_YOUR_TEAMS_YEARLY_ID
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_MONTHLY_ID
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY=price_YOUR_ENTERPRISE_YEARLY_ID

# App Configuration
NEXT_PUBLIC_APP_URL=https://pipilot.dev
```

## **3. Verify Configuration**

### **Test Environment Variables:**
```bash
# Check if variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY)"
```

### **Test Configuration in Browser:**
1. Visit `https://pipilot.dev/pricing`
2. Toggle between Monthly/Yearly
3. Check that prices update correctly
4. Try clicking "Select plan" (should redirect to Stripe)

## **4. Alternative: Use Test Mode**

If you want to test without live payments:

### **Get Test Keys from Stripe:**
```
Publishable key: pk_test_...
Secret key: sk_test_...
```

### **Create Test Products:**
Use the same process above but in **Test mode** in Stripe dashboard.

### **Test Environment:**
```env
# Test keys (replace with your test keys)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY

# Test price IDs
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_test_pro_monthly
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_test_pro_yearly
# ... etc
```

## **5. Features of Our Configuration System**

✅ **Centralized Configuration**: All product details in `lib/stripe-config.ts`
✅ **Dynamic Pricing**: Monthly/Yearly toggle with savings calculation
✅ **Type Safety**: Full TypeScript support
✅ **Easy Maintenance**: Single source of truth for all pricing
✅ **Environment Variables**: Secure configuration
✅ **Helper Functions**: Easy access to prices, features, limits

## **6. Usage Examples**

```typescript
import { PRODUCT_CONFIGS, getPrice, getSavings, getLimits } from '@/lib/stripe-config'

// Get Pro plan configuration
const proConfig = PRODUCT_CONFIGS.pro

// Get price for Teams plan (monthly)
const teamsPrice = getPrice('teams', false) // Returns 30

// Get savings for Pro plan (yearly)
const proSavings = getSavings('pro', true) // Returns "20%"

// Get limits for Enterprise plan
const enterpriseLimits = getLimits('enterprise') // Returns { credits: 1000, appDeploys: 50, ... }
```

## **7. Troubleshooting**

### **Prices not updating?**
- Check environment variables are loaded
- Verify price IDs match Stripe dashboard
- Clear browser cache

### **Stripe redirect not working?**
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check success/cancel URLs in Stripe checkout creation

### **Configuration not loading?**
- Restart development server after env changes
- Check for typos in environment variable names
- Verify `.env.local` is in project root

## **8. Next Steps**

1. ✅ **Create products in Stripe** (manual step)
2. ✅ **Set environment variables**
3. ✅ **Test pricing page**
4. 🔄 **Deploy to production**
5. 🔄 **Monitor first payments**

---

**🎉 Your pricing configuration is now centralized and maintainable!**

The `lib/stripe-config.ts` file contains all your product definitions, making it easy to:
- Update prices
- Add new features
- Modify limits
- Change descriptions

All changes are automatically reflected in your pricing page! 🚀

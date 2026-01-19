const Stripe = require('stripe')

// Stripe secret key must be provided via environment variable
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required')
  console.error('   Set it before running this script:')
  console.error('   STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-stripe-products-with-keys.js')
  process.exit(1)
}

// Initialize Stripe with user's key
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-18.acacia',
})

// Product definition for PiPilot Pro
const productConfig = {
  name: 'PiPilot Enterprisee',
  description: 'Professional AI development for serious developers',
  monthlyPrice: 99, // $29/month
  yearlyPrice: 379, // $279/year (20% savings)
}

async function createStripeProducts() {
  console.log('🚀 Creating PiPilot Pro product and prices...\n')
  console.log(`🔑 Using Stripe key: ${stripeSecretKey.substring(0, 20)}...\n`)

  try {
    // Create the product
    console.log(`📦 Creating product: ${productConfig.name}`)

    const product = await stripe.products.create({
      name: productConfig.name,
      description: productConfig.description,
      metadata: {
        app: 'pixel-pilot-plus',
        plan_type: 'plus'
      }
    })

    console.log(`✅ Product created: ${product.id}\n`)

    // Create monthly price
    console.log('💰 Creating monthly price ($29/month)...')
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: productConfig.monthlyPrice * 100, // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        billing_type: 'monthly',
        savings: '0%'
      }
    })

    console.log(`✅ Monthly price created: ${monthlyPrice.id} - $${productConfig.monthlyPrice}/month\n`)

    // Create yearly price
    console.log('💰 Creating yearly price ($279/year)...')
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: productConfig.yearlyPrice * 100, // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1,
      },
      metadata: {
        billing_type: 'yearly',
        savings: '20%'
      }
    })

    console.log(`✅ Yearly price created: ${yearlyPrice.id} - $${productConfig.yearlyPrice}/year`)
    console.log('💸 Savings: 20% off when billed annually\n')

    // Output the configuration for .env.local
    console.log('🎉 Product and prices created successfully!\n')
    console.log('📋 Add these to your .env.local file:\n')

    console.log('# Stripe Price IDs')
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=${monthlyPrice.id}`)
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=${yearlyPrice.id}`)
    console.log('')
    console.log('# Your Stripe keys')
    console.log('STRIPE_SECRET_KEY=<your-stripe-secret-key>')
    console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>')
    console.log('')
    console.log('✅ Ready to test your subscription system!')

  } catch (error) {
    console.error('❌ Error creating products and prices:', error.message)

    if (error.message.includes('Invalid API Key')) {
      console.error('\n🔑 Tip: Make sure your STRIPE_SECRET_KEY environment variable is set correctly')
    }

    process.exit(1)
  }
}

// Run the script
createStripeProducts()

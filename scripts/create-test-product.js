#!/usr/bin/env node

// Script to create a test product and price in Stripe for testing
const Stripe = require('stripe')

// Test API keys - you can replace these with your actual keys
const TEST_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key_here'
const TEST_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here'

console.log('🧪 STRIPE TEST PRODUCT CREATOR')
console.log('===============================')
console.log('')

async function createTestProduct() {
  let stripe

  try {
    // Initialize Stripe with secret key
    console.log('🔄 Initializing Stripe...')
    stripe = new Stripe(TEST_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
    console.log('✅ Stripe initialized successfully')
    console.log('')

    // Create a test product
    console.log('📦 Creating test product...')
    const product = await stripe.products.create({
      name: 'Pixel Pilot Test Pro Plan',
      description: 'Test subscription for Pixel Pilot Pro features',
      type: 'service',
      metadata: {
        app: 'pixel-pilot',
        environment: 'test'
      }
    })

    console.log('✅ Product created:')
    console.log(`   ID: ${product.id}`)
    console.log(`   Name: ${product.name}`)
    console.log(`   Description: ${product.description}`)
    console.log('')

    // Create monthly price
    console.log('💰 Creating monthly price...')
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'pro',
        billing_interval: 'monthly'
      }
    })

    console.log('✅ Monthly price created:')
    console.log(`   Price ID: ${monthlyPrice.id}`)
    console.log(`   Amount: $${monthlyPrice.unit_amount / 100}`)
    console.log(`   Currency: ${monthlyPrice.currency}`)
    console.log(`   Interval: ${monthlyPrice.recurring.interval}`)
    console.log('')

    // Create yearly price
    console.log('💰 Creating yearly price...')
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 27900, // $279.00
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        plan_type: 'pro',
        billing_interval: 'yearly'
      }
    })

    console.log('✅ Yearly price created:')
    console.log(`   Price ID: ${yearlyPrice.id}`)
    console.log(`   Amount: $${yearlyPrice.unit_amount / 100}`)
    console.log(`   Currency: ${yearlyPrice.currency}`)
    console.log(`   Interval: ${yearlyPrice.recurring.interval}`)
    console.log('')

    // Display environment variable instructions
    console.log('📝 Environment Variables to Update:')
    console.log('=====================================')
    console.log('')
    console.log('Add these to your .env.local file:')
    console.log('')
    console.log(`STRIPE_SECRET_KEY=${TEST_SECRET_KEY}`)
    console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${TEST_PUBLISHABLE_KEY}`)
    console.log(`STRIPE_PRODUCT_PRO=${product.id}`)
    console.log(`STRIPE_PRICE_PRO_MONTHLY=${monthlyPrice.id}`)
    console.log(`STRIPE_PRICE_PRO_YEARLY=${yearlyPrice.id}`)
    console.log('')

    // Test API connectivity
    console.log('🔗 Testing API connectivity...')
    const testProducts = await stripe.products.list({ limit: 1 })
    console.log(`✅ API connection successful - Found ${testProducts.data.length} product(s)`)
    console.log('')

    console.log('🎉 SUCCESS! Test product created successfully!')
    console.log('===============================================')
    console.log('')
    console.log('Next steps:')
    console.log('1. Update your environment variables with the values above')
    console.log('2. Restart your development server')
    console.log('3. Test the checkout flow on your pricing page')
    console.log('')

  } catch (error) {
    console.error('❌ Error creating test product:')
    console.error(error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('1. Make sure your Stripe secret key is valid')
    console.log('2. Check your internet connection')
    console.log('3. Verify your Stripe account has API access')
    console.log('')
    console.log('💡 If you need test keys:')
    console.log('   Go to: https://dashboard.stripe.com/test/apikeys')
    process.exit(1)
  }
}

// Check if secret key is provided
if (!TEST_SECRET_KEY || TEST_SECRET_KEY.includes('your_test_key_here')) {
  console.log('❌ STRIPE_SECRET_KEY not found!')
  console.log('')
  console.log('📝 To get your test keys:')
  console.log('1. Go to https://dashboard.stripe.com/test/apikeys')
  console.log('2. Copy your "Secret key" (starts with sk_test_)')
  console.log('3. Copy your "Publishable key" (starts with pk_test_)')
  console.log('4. Set them as environment variables:')
  console.log('   STRIPE_SECRET_KEY=sk_test_...')
  console.log('   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...')
  console.log('')
  console.log('Or run this script with your keys set as env vars.')
  process.exit(1)
}

// Run the script
createTestProduct().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})

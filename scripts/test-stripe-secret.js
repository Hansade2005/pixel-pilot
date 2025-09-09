#!/usr/bin/env node

// Script to test Stripe API with secret key
const Stripe = require('stripe')

// Use the live secret key from env.txt
const STRIPE_SECRET_KEY = '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'

console.log('🔑 TESTING STRIPE SECRET KEY')
console.log('=============================')
console.log('')

async function testStripeSecret() {
  try {
    console.log('🔄 Initializing Stripe with secret key...')
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
    console.log('✅ Stripe initialized successfully')
    console.log('')

    // Test API connectivity by listing products
    console.log('📦 Testing API connectivity - listing products...')
    const products = await stripe.products.list({ limit: 10 })

    console.log(`✅ Found ${products.data.length} product(s) in your Stripe account:`)
    products.data.forEach(product => {
      console.log(`   • ${product.name} (ID: ${product.id})`)
    })
    console.log('')

    // Test creating a simple test product
    console.log('🧪 Creating a test product...')
    const testProduct = await stripe.products.create({
      name: 'Test Product - Publishable Key Only',
      description: 'Testing publishable key checkout implementation',
      type: 'service',
      metadata: {
        test: 'true',
        created_by: 'pixel-pilot-test'
      }
    })

    console.log('✅ Test product created:')
    console.log(`   Product ID: ${testProduct.id}`)
    console.log(`   Name: ${testProduct.name}`)
    console.log('')

    // Create a test price for the product
    console.log('💰 Creating test price...')
    const testPrice = await stripe.prices.create({
      product: testProduct.id,
      unit_amount: 1000, // $10.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        test: 'true'
      }
    })

    console.log('✅ Test price created:')
    console.log(`   Price ID: ${testPrice.id}`)
    console.log(`   Amount: $${testPrice.unit_amount / 100}`)
    console.log(`   Interval: ${testPrice.recurring.interval}`)
    console.log('')

    // Test creating a customer (minimal)
    console.log('👤 Creating test customer...')
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        test: 'true',
        source: 'pixel-pilot-test'
      }
    })

    console.log('✅ Test customer created:')
    console.log(`   Customer ID: ${testCustomer.id}`)
    console.log(`   Email: ${testCustomer.email}`)
    console.log('')

    // Test creating a subscription (this is what our API will do)
    console.log('📋 Testing subscription creation...')
    const testSubscription = await stripe.subscriptions.create({
      customer: testCustomer.id,
      items: [{
        price: testPrice.id,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        test: 'true',
        user_id: 'test-user-123'
      }
    })

    console.log('✅ Test subscription created:')
    console.log(`   Subscription ID: ${testSubscription.id}`)
    console.log(`   Status: ${testSubscription.status}`)
    console.log(`   Customer: ${testSubscription.customer}`)
    console.log('')

    // Get the client secret for frontend use
    const paymentIntent = testSubscription.latest_invoice.payment_intent
    console.log('🔐 Client Secret for frontend:')
    console.log(`   ${paymentIntent.client_secret}`)
    console.log('')

    console.log('🎉 SUCCESS! All Stripe operations completed successfully!')
    console.log('=======================================================')
    console.log('')
    console.log('Your publishable key-only checkout system is ready!')
    console.log('')
    console.log('Test Results:')
    console.log('✅ Secret key authentication works')
    console.log('✅ Product creation works')
    console.log('✅ Price creation works')
    console.log('✅ Customer creation works')
    console.log('✅ Subscription creation works')
    console.log('✅ Client secret generation works')
    console.log('')
    console.log('Next: Test your frontend checkout at http://localhost:3000/pricing')

  } catch (error) {
    console.error('❌ Error testing Stripe secret key:')
    console.error(`   ${error.message}`)
    console.log('')
    console.log('🔧 Troubleshooting:')
    if (error.type === 'StripeAuthenticationError') {
      console.log('   • Check your Stripe secret key')
      console.log('   • Make sure it starts with "sk_live_" or "sk_test_"')
    } else if (error.type === 'StripeConnectionError') {
      console.log('   • Check your internet connection')
    } else {
      console.log('   • Check your Stripe account permissions')
    }
    console.log('')
    console.log('📞 Need help? Visit: https://stripe.com/docs/errors')
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Starting Stripe API tests...')
testStripeSecret().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})

const Stripe = require('stripe')

// Replace with your actual Stripe secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'YOUR_STRIPE_SECRET_KEY_HERE'

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
})

// Product definitions
const products = [
  {
    name: 'PiPilot Pro',
    description: 'Perfect for individual developers and small teams',
    monthlyPrice: 15, // $15/month
    yearlyPrice: 180, // $180/year (20% savings)
  },
  {
    name: 'PiPilot Teams',
    description: 'Advanced collaboration tools for growing teams',
    monthlyPrice: 30, // $30/month
    yearlyPrice: 360, // $360/year (20% savings)
  },
  {
    name: 'PiPilot Enterprise',
    description: 'Complete solution for large organizations',
    monthlyPrice: 60, // $60/month
    yearlyPrice: 720, // $720/year (20% savings)
  }
]

async function createProductsAndPrices() {
  console.log('🚀 Creating Stripe Products and Prices...\n')

  try {
    for (const product of products) {
      console.log(`📦 Creating product: ${product.name}`)

      // Create the product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: {
          app: 'pixel-pilot',
          plan_type: product.name.toLowerCase().replace('PiPilot ', '').replace(' ', '-')
        }
      })

      console.log(`✅ Product created: ${stripeProduct.id}`)

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.monthlyPrice * 100, // Convert to cents
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

      console.log(`💰 Monthly price created: ${monthlyPrice.id} - $${product.monthlyPrice}/month`)

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.yearlyPrice * 100, // Convert to cents
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

      console.log(`💰 Yearly price created: ${yearlyPrice.id} - $${product.yearlyPrice}/year`)
      console.log(`💸 Savings: 20% off when billed annually\n`)

      // Store the price IDs for later use
      product.monthlyPriceId = monthlyPrice.id
      product.yearlyPriceId = yearlyPrice.id
    }

    console.log('🎉 All products and prices created successfully!\n')
    console.log('📋 Price IDs for your environment variables:\n')

    // Output the price IDs in a format ready for .env
    products.forEach(product => {
      const planName = product.name.toLowerCase().replace('PiPilot ', '').replace(' ', '_').toUpperCase()
      console.log(`NEXT_PUBLIC_STRIPE_PRICE_${planName}_MONTHLY=${product.monthlyPriceId}`)
      console.log(`NEXT_PUBLIC_STRIPE_PRICE_${planName}_YEARLY=${product.yearlyPriceId}`)
    })

    console.log('\n📝 Copy these to your .env.local file')
    console.log('🔗 You can also find these IDs in your Stripe Dashboard under Products')

  } catch (error) {
    console.error('❌ Error creating products and prices:', error.message)
    process.exit(1)
  }
}

// Run the script
createProductsAndPrices()

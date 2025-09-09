"use client"

import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, Shield, Lock } from 'lucide-react'
import { getClientStripeConfig } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/client'
import { getPriceId } from '@/lib/stripe-config'

// Initialize Stripe with publishable key only
const stripePromise = loadStripe(getClientStripeConfig().publishableKey)

interface ClientCheckoutFormProps {
  planType: string
  isAnnual: boolean
  onSuccess: () => void
  onCancel: () => void
}

function CheckoutForm({ planType, isAnnual, onSuccess, onCancel }: ClientCheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Create subscription on the client side
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pricing?success=true`,
        },
      })

      if (error) {
        setMessage(error.message || 'An error occurred.')
      } else {
        onSuccess()
      }
    } catch (error: any) {
      setMessage('An unexpected error occurred.')
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <Shield className="w-4 h-4 text-green-400" />
          <span>Secure payment powered by Stripe</span>
        </div>

        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'paypal']
          }}
        />
      </div>

      {message && (
        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800/50">
          {message}
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-400 text-center space-y-1">
        <div className="flex items-center justify-center space-x-1">
          <Lock className="w-3 h-3" />
          <span>256-bit SSL encryption</span>
        </div>
        <p>Your payment information is secure and never stored on our servers.</p>
      </div>
    </form>
  )
}

interface ClientCheckoutProps {
  planType: string
  isAnnual: boolean
  onSuccess: () => void
  onCancel: () => void
}

export function ClientCheckout({ planType, isAnnual, onSuccess, onCancel }: ClientCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true)
        setError('')

        // Get user authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Please log in to continue with your subscription.')
          setLoading(false)
          return
        }

        // Get price ID from configuration
        const priceId = getPriceId(planType, isAnnual)

        if (!priceId) {
          setError('Invalid plan configuration. Please try again.')
          setLoading(false)
          return
        }

        // Create subscription intent (this will use publishable key approach)
        const response = await fetch('/api/stripe/create-subscription-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType,
            isAnnual,
            priceId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create payment intent')
        }

        const { clientSecret: secret } = await response.json()
        setClientSecret(secret)

      } catch (error: any) {
        console.error('Error creating payment intent:', error)
        setError(error.message || 'Failed to initialize payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [planType, isAnnual, supabase])

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-gray-300">Setting up secure payment...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-400 text-sm bg-red-900/20 p-4 rounded-lg border border-red-800/50">
              {error}
            </div>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#a855f7',
        colorBackground: '#1f2937',
        colorText: '#f3f4f6',
        colorDanger: '#ef4444',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          boxShadow: '0 0 0 1px #374151',
        },
        '.Input:focus': {
          boxShadow: '0 0 0 2px #a855f7',
        },
      },
    },
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-center">Complete Your Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            planType={planType}
            isAnnual={isAnnual}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  )
}

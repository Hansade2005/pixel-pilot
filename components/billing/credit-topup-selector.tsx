"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PaymentProvider = "stripe" | "polar"

interface CreditTopUpSelectorProps {
  credits: number
  onClose?: () => void
}

export function CreditTopUpSelector({ credits, onClose }: CreditTopUpSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("stripe")
  const [isProcessing, setIsProcessing] = useState(false)

  // 1 credit = $0.01 USD
  const amount = credits
  const priceUSD = credits * 0.01

  const handlePurchase = async () => {
    try {
      setIsProcessing(true)

      if (selectedProvider === "stripe") {
        // Use Stripe
        const response = await fetch('/api/stripe/purchase-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credits }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create Stripe checkout')
        }

        const { url } = await response.json()
        window.location.href = url
      } else {
        // Use Polar
        const response = await fetch('/api/polar/purchase-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credits }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create Polar checkout')
        }

        const { url } = await response.json()
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert(error instanceof Error ? error.message : 'Failed to process purchase')
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-gray-800 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Purchase {credits.toLocaleString()} Credits</CardTitle>
        <CardDescription className="text-gray-400">
          Choose your payment method (1 credit = $0.01 USD)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Provider Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">Payment Method</Label>
          <RadioGroup
            value={selectedProvider}
            onValueChange={(value) => setSelectedProvider(value as PaymentProvider)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 rounded-lg border border-white/10 p-4 hover:bg-orange-500/10 cursor-pointer">
              <RadioGroupItem value="stripe" id="stripe" />
              <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                <div className="font-medium text-white">Stripe</div>
                <div className="text-sm text-gray-400">
                  Pay with credit card via Stripe
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-white/10 p-4 hover:bg-orange-500/10 cursor-pointer">
              <RadioGroupItem value="polar" id="polar" />
              <Label htmlFor="polar" className="flex-1 cursor-pointer">
                <div className="font-medium text-white">Polar</div>
                <div className="text-sm text-gray-400">
                  Pay with Polar checkout
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Price Summary */}
        <div className="rounded-lg bg-gray-900/80 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Credits</span>
            <span className="font-medium text-white">{credits.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rate</span>
            <span className="font-medium text-white">$0.01 per credit</span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-orange-400">${priceUSD.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Purchase Button */}
        <div className="flex gap-3">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Purchase with {selectedProvider === "stripe" ? "Stripe" : "Polar"}</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

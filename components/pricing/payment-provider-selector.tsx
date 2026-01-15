"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Zap, ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentProviderSelectorProps {
  plan: "creator" | "collaborate" | "scale"
  onClose?: () => void
}

/**
 * Payment Provider Selector Component
 * 
 * Allows users to choose between Stripe and Polar for subscription payments.
 * Provides flexibility and redundancy in payment processing.
 */

export function PaymentProviderSelector({ plan, onClose }: PaymentProviderSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "polar">("stripe")
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)

    try {
      if (selectedProvider === "stripe") {
        // Create Stripe checkout session
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        })

        if (!response.ok) {
          throw new Error("Failed to create Stripe checkout session")
        }

        const { sessionId } = await response.json()

        // Redirect to Stripe checkout
        const stripe = await import("@stripe/stripe-js").then((mod) =>
          mod.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        )

        if (stripe) {
          await stripe.redirectToCheckout({ sessionId })
        }
      } else {
        // Create Polar checkout session
        const response = await fetch("/api/polar/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval: billingInterval }),
        })

        if (!response.ok) {
          throw new Error("Failed to create Polar checkout session")
        }

        const { checkoutUrl } = await response.json()

        // Redirect to Polar checkout
        window.location.href = checkoutUrl
      }
    } catch (err) {
      console.error("Checkout error:", err)
      setError(err instanceof Error ? err.message : "Failed to start checkout")
      setLoading(false)
    }
  }

  const planDetails = {
    creator: { 
      name: "Creator Plan", 
      monthly: { price: "$15", yearlyTotal: "$144", savings: "$36" },
      credits: "50 credits/month" 
    },
    collaborate: { 
      name: "Collaborate Plan", 
      monthly: { price: "$25", yearlyTotal: "$240", savings: "$60" },
      credits: "75 credits/month" 
    },
    scale: { 
      name: "Scale Plan", 
      monthly: { price: "$60", yearlyTotal: "$576", savings: "$144" },
      credits: "150 credits/month" 
    },
  }

  const details = planDetails[plan]
  const pricing = billingInterval === "monthly" ? details.monthly : details.monthly

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">{details.name}</h3>
        
        {/* Billing Interval Selector */}
        <Tabs value={billingInterval} onValueChange={(value: any) => setBillingInterval(value)} className="mt-4">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {billingInterval === "monthly" ? (
          <>
            <p className="text-3xl font-bold text-primary mt-4">{pricing.price}/month</p>
            <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-primary mt-4">{pricing.yearlyTotal}/year</p>
            <p className="text-sm text-green-600 mt-1">Save {pricing.savings} per year!</p>
          </>
        )}
        
        <p className="text-sm text-muted-foreground mt-2">{details.credits}</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Choose Payment Provider</Label>
        
        <RadioGroup value={selectedProvider} onValueChange={(value: any) => setSelectedProvider(value)}>
          <Card className={`cursor-pointer transition-all ${selectedProvider === "stripe" ? "ring-2 ring-primary" : ""}`}>
            <CardHeader className="p-4">
              <div className="flex items-center space-x-4">
                <RadioGroupItem value="stripe" id="stripe" />
                <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-semibold">Stripe</div>
                        <div className="text-xs text-muted-foreground">Credit card, Apple Pay, Google Pay</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Primary</Badge>
                  </div>
                </Label>
              </div>
            </CardHeader>
          </Card>

          <Card className={`cursor-pointer transition-all ${selectedProvider === "polar" ? "ring-2 ring-primary" : ""}`}>
            <CardHeader className="p-4">
              <div className="flex items-center space-x-4">
                <RadioGroupItem value="polar" id="polar" />
                <Label htmlFor="polar" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-semibold">Polar</div>
                        <div className="text-xs text-muted-foreground">Alternative payment processor</div>
                      </div>
                    </div>
                    <Badge variant="outline">Backup</Badge>
                  </div>
                </Label>
              </div>
            </CardHeader>
          </Card>
        </RadioGroup>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubscribe} className="flex-1" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue with {selectedProvider === "stripe" ? "Stripe" : "Polar"}
              <ExternalLink className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {selectedProvider === "stripe" ? (
          <p>You'll be redirected to Stripe's secure checkout page</p>
        ) : (
          <p>You'll be redirected to Polar's secure checkout page</p>
        )}
      </div>
    </div>
  )
}

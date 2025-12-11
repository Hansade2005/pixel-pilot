"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
    DollarSign, TrendingUp, CreditCard, Landmark, AlertCircle,
    CheckCircle, Clock, ArrowUp, Copy, Eye, EyeOff
  } from 'lucide-react'

interface CreatorEarnings {
  total_earned: number
  total_paid_out: number
  pending_balance: number
  available_balance: number
}

interface TemplateStats {
  template_id: string
  template_name: string
  total_sales: number
  total_revenue: number
  rating: number
  review_count: number
  featured: boolean
}

interface PayoutRequest {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
}

interface BankDetails {
  account_holder_name: string
  account_number: string
  routing_number: string
  bank_name: string
}

export function TemplateEarningsView({ userId }: { userId: string }) {
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null)
  const [templateStats, setTemplateStats] = useState<TemplateStats[]>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreator, setIsCreator] = useState(false)
  const { toast } = useToast()

  // Payout request state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState<string>('')
  const [isRequestingPayout, setIsRequestingPayout] = useState(false)

  // Bank details state
  const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false)
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    bank_name: ''
  })
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false)
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [showRoutingNumber, setShowRoutingNumber] = useState(false)
  const [isEnablingCreatorMode, setIsEnablingCreatorMode] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchEarningsData()
  }, [userId])

  const enableCreatorMode = async () => {
    try {
      setIsEnablingCreatorMode(true)

      const response = await fetch('/api/marketplace/creator/enable-creator-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enable creator mode')
      }

      const data = await response.json()

      toast({
        title: 'Success',
        description: 'Creator mode enabled! You can now start selling templates.',
      })

      // Refresh the earnings data
      setIsCreator(true)
      fetchEarningsData()
    } catch (error) {
      console.error('Error enabling creator mode:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to enable creator mode',
        variant: 'destructive',
      })
    } finally {
      setIsEnablingCreatorMode(false)
    }
  }

  const fetchEarningsData = async () => {
    try {
      setLoading(true)

      // Check if user is creator
      const creatorCheckResponse = await fetch('/api/marketplace/creator/earnings')
      
      if (!creatorCheckResponse.ok) {
        setIsCreator(false)
        setLoading(false)
        return
      }

      const creatorData = await creatorCheckResponse.json()
      
      if (!creatorData || creatorData.error) {
        setIsCreator(false)
        setLoading(false)
        return
      }

      setIsCreator(true)
      setEarnings({
        total_earned: creatorData.total_earned || 0,
        total_paid_out: creatorData.total_paid_out || 0,
        pending_balance: creatorData.pending_balance || 0,
        available_balance: creatorData.available_balance || 0
      })

      // Fetch template stats
      if (creatorData.top_templates) {
        setTemplateStats(creatorData.top_templates)
      }

      // Fetch payout history
      if (creatorData.payout_history) {
        setPayoutHistory(creatorData.payout_history)
      }

    } catch (error) {
      console.error('Error fetching earnings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load earnings data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBankDetails = async () => {
    try {
      if (!bankDetails.account_holder_name || !bankDetails.account_number || 
          !bankDetails.routing_number || !bankDetails.bank_name) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all bank details',
          variant: 'destructive',
        })
        return
      }

      setIsSavingBankDetails(true)

      const response = await fetch('/api/marketplace/creator/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_bank_details',
          bank_details: bankDetails
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save bank details')
      }

      toast({
        title: 'Success',
        description: 'Bank details saved successfully',
      })

      setIsBankDetailsModalOpen(false)
    } catch (error) {
      console.error('Error saving bank details:', error)
      toast({
        title: 'Error',
        description: 'Failed to save bank details',
        variant: 'destructive',
      })
    } finally {
      setIsSavingBankDetails(false)
    }
  }

  const handleRequestPayout = async () => {
    try {
      const amount = parseFloat(payoutAmount)

      if (!amount || amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        })
        return
      }

      if (!earnings || amount > earnings.pending_balance) {
        toast({
          title: 'Insufficient Balance',
          description: `You only have $${earnings?.pending_balance.toFixed(2)} available for payout`,
          variant: 'destructive',
        })
        return
      }

      if (amount < 50) {
        toast({
          title: 'Minimum Amount',
          description: 'Minimum payout amount is $50.00',
          variant: 'destructive',
        })
        return
      }

      setIsRequestingPayout(true)

      const response = await fetch('/api/marketplace/creator/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_payout',
          amount: amount
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to request payout')
      }

      const result = await response.json()

      toast({
        title: 'Payout Requested',
        description: `$${amount.toFixed(2)} payout will be processed in 2-5 business days`,
      })

      setIsPayoutModalOpen(false)
      setPayoutAmount('')
      fetchEarningsData()
    } catch (error) {
      console.error('Error requesting payout:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request payout',
        variant: 'destructive',
      })
    } finally {
      setIsRequestingPayout(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading earnings data...</p>
        </div>
      </div>
    )
  }

  if (!isCreator) {
    return (
      <div className="p-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">Not a Creator Yet</CardTitle>
            <CardDescription className="text-yellow-700">
              You need to enable creator mode to start selling templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={enableCreatorMode}
              disabled={isEnablingCreatorMode}
              className="mt-4"
            >
              {isEnablingCreatorMode ? 'Enabling...' : 'Enable Creator Mode'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const maskAccountNumber = (num: string) => {
    return '*'.repeat(num.length - 4) + num.slice(-4)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creator Earnings</h1>
        <p className="text-muted-foreground mt-2">Manage your template sales and payouts</p>
      </div>

      {/* Earnings Summary Cards */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Earned */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">${earnings.total_earned.toFixed(2)}</div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">All time earnings</p>
            </CardContent>
          </Card>

          {/* Pending Payout */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">${earnings.pending_balance.toFixed(2)}</div>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ready to withdraw</p>
            </CardContent>
          </Card>

          {/* Already Paid Out */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Already Paid Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">${earnings.total_paid_out.toFixed(2)}</div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Completed payouts</p>
            </CardContent>
          </Card>

          {/* Current Balance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">${earnings.available_balance.toFixed(2)}</div>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Available to withdraw</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={() => setIsPayoutModalOpen(true)}
          disabled={!earnings || earnings.pending_balance < 50}
          className="gap-2"
        >
          <ArrowUp className="h-4 w-4" />
          Request Payout
        </Button>
        <Button 
          variant="outline"
          onClick={() => setIsBankDetailsModalOpen(true)}
          className="gap-2"
        >
          <Landmark className="h-4 w-4" />
          Bank Details
        </Button>
        <Button 
          variant="ghost"
          onClick={fetchEarningsData}
          className="gap-2"
        >
          Refresh
        </Button>
      </div>

      {/* Bank Details Info Card */}
      {earnings && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-900">Payout Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <ul className="space-y-2">
              <li>✓ Minimum payout: $50.00</li>
              <li>✓ Processing time: 2-5 business days</li>
              <li>✓ Payments sent to your registered bank account </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      {payoutHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Your recent payout requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map(payout => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          payout.status === 'completed' ? 'default' :
                          payout.status === 'processing' ? 'secondary' :
                          payout.status === 'failed' ? 'destructive' :
                          'outline'
                        }>
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payout.completed_at 
                          ? new Date(payout.completed_at).toLocaleDateString()
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Withdraw your earnings to your bank account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {earnings && (
              <>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold">${earnings.pending_balance.toFixed(2)}</p>
                </div>

                {earnings.pending_balance < 50 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      Minimum payout amount is $50.00. You need ${(50 - earnings.pending_balance).toFixed(2)} more.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Withdrawal Amount</Label>
                  <div className="flex gap-2 mt-2">
                    <span className="flex items-center px-3 bg-gray-100 rounded-md text-gray-700 font-medium">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      max={earnings.pending_balance}
                      step="0.01"
                      min="50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: $50.00 | Maximum: ${earnings.pending_balance.toFixed(2)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-blue-900">Processing Details:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Transfers to your registered bank account</li>
                    <li>✓ Processing time: 2-5 business days</li>
                    <li>✓ Check "Bank Details" to update account info</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPayoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={isRequestingPayout || !payoutAmount || !earnings || earnings.pending_balance < 50}
            >
              {isRequestingPayout ? 'Processing...' : 'Request Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Details Modal */}
      <Dialog open={isBankDetailsModalOpen} onOpenChange={setIsBankDetailsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>
              Where should we send your payouts?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Security Info */}
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Your bank details are encrypted and stored securely
              </p>
            </div>

            {/* Account Holder Name */}
            <div>
              <Label htmlFor="account-holder">Account Holder Name</Label>
              <Input
                id="account-holder"
                placeholder="John Doe"
                value={bankDetails.account_holder_name}
                onChange={(e) => setBankDetails({
                  ...bankDetails,
                  account_holder_name: e.target.value
                })}
                className="mt-1"
              />
            </div>

            {/* Bank Name */}
            <div>
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input
                id="bank-name"
                placeholder="Chase Bank, Bank of America, etc."
                value={bankDetails.bank_name}
                onChange={(e) => setBankDetails({
                  ...bankDetails,
                  bank_name: e.target.value
                })}
                className="mt-1"
              />
            </div>

            {/* Account Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="account-number">Account Number</Label>
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                id="account-number"
                type={showAccountNumber ? "text" : "password"}
                placeholder="0123456789"
                value={bankDetails.account_number}
                onChange={(e) => setBankDetails({
                  ...bankDetails,
                  account_number: e.target.value.replace(/\D/g, '')
                })}
                className="mt-1 font-mono"
              />
            </div>

            {/* Routing Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="routing-number">Routing Number</Label>
                <button
                  type="button"
                  onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showRoutingNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                id="routing-number"
                type={showRoutingNumber ? "text" : "password"}
                placeholder="021000021"
                value={bankDetails.routing_number}
                onChange={(e) => setBankDetails({
                  ...bankDetails,
                  routing_number: e.target.value.replace(/\D/g, '')
                })}
                className="mt-1 font-mono"
              />
            </div>

            {/* Help Text */}
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-muted-foreground space-y-1">
              <p>💡 <strong>Need help finding these details?</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your checkbook or bank statement</li>
                <li>Call your bank's customer service</li>
                <li>Log into your online banking portal</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBankDetailsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBankDetails}
              disabled={isSavingBankDetails}
            >
              {isSavingBankDetails ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

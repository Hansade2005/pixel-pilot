'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Clock, CheckCircle, AlertCircle, DollarSign, Users, Zap
} from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"

interface PayoutRequest {
  id: string
  creator_id: string
  creator_name?: string
  creator_email?: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  completed_at?: string
  stripe_transfer_id?: string
}

interface Summary {
  total_pending_requests: number
  total_processing: number
  total_completed: number
  total_failed: number
  total_pending_amount: number
}

export function AdminMarketplacePayoutManager() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  // Dialog state
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPayouts()
  }, [statusFilter, page])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/marketplace/payouts?status=${statusFilter}&page=${page}&limit=20`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch payouts')
      }

      const data = await response.json()
      setPayouts(data.payouts)
      setSummary(data.summary)
      setTotalPages(data.pagination.pages)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Failed to load payouts',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (payout: PayoutRequest, newStatus: string) => {
    setSelectedPayout(payout)
    setNotes('')
    setIsDetailDialogOpen(true)
  }

  const submitStatusChange = async () => {
    if (!selectedPayout) return

    try {
      setIsProcessing(true)
      const action = `mark_${statusFilter === 'pending' ? 'processing' : 'completed'}`

      const response = await fetch('/api/admin/marketplace/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          payout_id: selectedPayout.id,
          notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payout status')
      }

      toast({
        title: 'Success',
        description: `Payout marked as ${action.replace('mark_', '')}`,
      })

      setIsDetailDialogOpen(false)
      setSelectedPayout(null)
      fetchPayouts()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update payout status',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectPayout = async (payout: PayoutRequest) => {
    try {
      setIsProcessing(true)
      const response = await fetch('/api/admin/marketplace/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_failed',
          payout_id: payout.id,
          notes: 'Rejected by admin'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reject payout')
      }

      toast({
        title: 'Success',
        description: 'Payout rejected and funds refunded to creator',
      })

      fetchPayouts()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject payout',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <Zap className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payouts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payout Management</h1>
        <p className="text-muted-foreground mt-2">Review and process creator payout requests</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.total_pending_requests}</div>
              <p className="text-xs text-muted-foreground mt-1">${summary.total_pending_amount.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.total_processing}</div>
              <p className="text-xs text-muted-foreground mt-1">In transit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.total_completed}</div>
              <p className="text-xs text-muted-foreground mt-1">Delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.total_failed}</div>
              <p className="text-xs text-muted-foreground mt-1">Refunded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">${summary.total_pending_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready to process</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="text-sm font-medium">Filter by Status</label>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchPayouts} variant="outline" className="mt-6">
          Refresh
        </Button>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            {payouts.length} payouts found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map(payout => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payout.creator_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{payout.creator_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payout.status)}>
                        <span className="mr-1">{getStatusIcon(payout.status)}</span>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payout.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(payout, 'processing')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Process
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectPayout(payout)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {payout.status === 'processing' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(payout, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPayout(payout)
                            setIsDetailDialogOpen(true)
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              Review and process this payout request
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Creator</p>
                    <p className="font-semibold">{selectedPayout.creator_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayout.creator_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold text-green-600">${selectedPayout.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedPayout.status)}>
                      {selectedPayout.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested</p>
                    <p className="font-medium">{new Date(selectedPayout.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedPayout.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">{new Date(selectedPayout.completed_at).toLocaleDateString()}</p>
                  </div>
                )}

                {selectedPayout.stripe_transfer_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stripe Transfer ID</p>
                    <p className="font-mono text-xs">{selectedPayout.stripe_transfer_id}</p>
                  </div>
                )}
              </div>

              {selectedPayout.status === 'pending' && (
                <div>
                  <label className="text-sm font-medium">Admin Notes (Optional)</label>
                  <Textarea
                    placeholder="Add any notes about this payout..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
            {selectedPayout?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleRejectPayout(selectedPayout)}
                  disabled={isProcessing}
                >
                  Reject
                </Button>
                <Button
                  onClick={submitStatusChange}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Processing...' : 'Mark Processing'}
                </Button>
              </>
            )}
            {selectedPayout?.status === 'processing' && (
              <Button
                onClick={submitStatusChange}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Processing...' : 'Mark Completed'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

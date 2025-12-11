# Admin Payout Management System

## Overview

The Admin Payout Management system enables administrators to review, process, and manage creator payout requests. Admins can view pending payouts, change their status, and handle refunds for failed payments.

## Features

### 1. **Payout Dashboard**
- **Location**: `/admin/marketplace/payouts`
- **Access**: Admin only (requires MANAGE_BILLING permission)
- **View**: Comprehensive list of all payout requests with filtering and pagination

### 2. **Summary Cards**
Displays real-time metrics:
- **Pending**: Number of pending payout requests and total amount waiting
- **Processing**: Number of payouts currently in transit
- **Completed**: Number of successfully processed payouts
- **Failed**: Number of failed/rejected payouts
- **Total Pending**: Total dollar amount ready for processing

### 3. **Payout Request Table**
Shows all payout requests with:
- Creator name and email
- Requested amount
- Current status (Pending, Processing, Completed, Failed)
- Date requested
- Action buttons based on status

### 4. **Status Filtering**
Filter payouts by status:
- **All Status**: View all payouts
- **Pending**: Awaiting admin action
- **Processing**: Currently being transferred
- **Completed**: Successfully paid out
- **Failed**: Rejected or refunded

### 5. **Pagination**
- 20 payouts per page
- Previous/Next navigation
- Shows current page and total pages

## Admin Workflow

### Step 1: Review Pending Payouts
1. Navigate to `/admin/marketplace/payouts`
2. Filter by "Pending" status (default)
3. View all pending payout requests with creator details

### Step 2: Process a Payout
**Option A: Quick Action**
1. Click "Process" button on the pending payout
2. Add optional notes (e.g., "Verified bank details")
3. Confirm to mark as "Processing"

**Option B: Detailed Review**
1. Click "Details" button to open detail dialog
2. Review creator information and payout details
3. Add admin notes
4. Click "Mark Processing" to proceed

### Step 3: Confirm Completion
1. Filter by "Processing" status
2. Click "Details" on the payout
3. Click "Mark Completed" after funds transfer is confirmed
4. Payout moves to "Completed" status

### Step 4: Handle Rejections
1. Click "Reject" button on pending payout
2. Rejection reason is automatically logged
3. Creator's balance is refunded instantly
4. Payout status changes to "Failed"

## API Integration

### Backend Endpoint
**URL**: `/api/admin/marketplace/payouts`

**GET Request**
```bash
GET /api/admin/marketplace/payouts?status=pending&page=1&limit=20
```

**Query Parameters**:
- `status` (optional): Filter by status - 'pending', 'processing', 'completed', 'failed', 'all'
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response**:
```json
{
  "payouts": [
    {
      "id": "payout_uuid",
      "creator_id": "user_uuid",
      "creator_name": "Creator Name",
      "creator_email": "creator@example.com",
      "amount": 250.00,
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "completed_at": null,
      "stripe_transfer_id": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "summary": {
    "total_pending_requests": 25,
    "total_processing": 5,
    "total_completed": 120,
    "total_failed": 0,
    "total_pending_amount": 12500.00
  }
}
```

**POST Request**
```bash
POST /api/admin/marketplace/payouts
Content-Type: application/json

{
  "action": "mark_processing",
  "payout_id": "payout_uuid",
  "notes": "Verified and ready to process"
}
```

**Actions**:
- `mark_processing`: Status → Processing
- `mark_completed`: Status → Completed (after Stripe transfer)
- `mark_failed`: Status → Failed, refunds creator

**Response**:
```json
{
  "success": true,
  "message": "Payout status updated",
  "payout": {
    "id": "payout_uuid",
    "status": "processing",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

## Database Tables

### payout_requests
Stores payout request information:
```sql
- id (UUID, Primary Key)
- creator_id (UUID, FK → users.id)
- amount (Decimal)
- status (pending | processing | completed | failed)
- created_at (Timestamp)
- updated_at (Timestamp)
- completed_at (Timestamp, nullable)
- stripe_transfer_id (String, nullable)
```

### creator_bank_details
Stores encrypted bank information:
```sql
- id (UUID, Primary Key)
- creator_id (UUID, FK → users.id)
- account_holder_name (String)
- account_number (String, encrypted)
- routing_number (String, encrypted)
- bank_name (String)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### admin_action_logs
Logs all admin actions for audit trail:
```sql
- id (UUID, Primary Key)
- admin_id (UUID, FK → users.id)
- payout_id (UUID, FK → payout_requests.id)
- action (String: mark_processing | mark_completed | mark_failed)
- notes (Text, nullable)
- created_at (Timestamp)
```

## Status Flow

```
[Pending]
   ↓
[Processing] ← Admin clicks "Mark Processing"
   ↓
[Completed] ← Admin clicks "Mark Completed" (after Stripe transfer)

[Pending]
   ↓
[Failed] ← Admin clicks "Reject" (refund to creator)
```

## Key Functions in Component

### handleStatusChange(payout, newStatus)
Opens the detail dialog to confirm status change with optional notes.

### submitStatusChange()
Submits the status change to the API and refreshes the list.

### handleRejectPayout(payout)
Rejects a payout and triggers refund to creator's balance.

### fetchPayouts()
Fetches payouts from API based on current filter and page.

### getStatusColor(status)
Returns CSS color class based on payout status:
- Pending: Yellow
- Processing: Blue
- Completed: Green
- Failed: Red

## Navigation

The payout management page is accessible from:
1. **Admin Dashboard**: Under "Payout Management" in sidebar menu
2. **URL**: `/admin/marketplace/payouts`
3. **Menu Item ID**: `payouts`
4. **Permission Required**: `MANAGE_BILLING`

## Success Indicators

✅ **Green Success Toast**: "Payout marked as [action]"
✅ **Status Updates**: Reflected immediately in the table
✅ **Summary Refresh**: Card metrics update automatically
✅ **Audit Trail**: All actions logged in admin_action_logs

## Error Handling

❌ **Failed Fetch**: Toast shows "Failed to load payouts"
❌ **Failed Update**: Toast shows "Failed to update payout status"
❌ **Unauthorized**: User redirected to /workspace if not admin
❌ **Invalid Action**: API returns 400 error with message

## Future Enhancements

1. **Batch Processing**: Process multiple payouts at once
2. **Export**: Download payout reports as CSV
3. **Scheduling**: Auto-process payouts on schedule
4. **Email Notifications**: Alert creators when payout is processed
5. **Stripe Integration**: Automated Stripe Connect transfers
6. **Tax Reporting**: Generate 1099 forms for creators
7. **Analytics**: Track payout processing times and success rates
8. **Filters**: Advanced search by creator name, date range, amount range

## Troubleshooting

**Payouts Not Showing**
- Verify user is admin (in admin_users table)
- Check MANAGE_BILLING permission
- Verify payout_requests table exists with data

**Status Changes Not Working**
- Check API endpoint permissions
- Verify bank details exist for creator
- Check admin_action_logs for errors

**Refund Not Processed**
- Verify creator_wallet table updated
- Check if pending_payout was decremented
- Review admin_action_logs for failed action

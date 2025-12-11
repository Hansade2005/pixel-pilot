# Template Earnings Integration Guide

## Navigation Integration

### 1. Add to Sidebar Navigation

**File**: `components/workspace/modern-sidebar.tsx` (or your sidebar component)

```tsx
// Add this to your navigation menu
{
  icon: <DollarSign className="w-4 h-4" />,
  label: "Creator Earnings",
  href: "/workspace?view=template-earnings",
  isActive: searchParams.get('view') === 'template-earnings'
}
```

### 2. Add to Header Navigation

**File**: `components/workspace/project-header.tsx`

```tsx
<Button
  variant={activeView === 'template-earnings' ? 'default' : 'ghost'}
  onClick={() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'template-earnings')
    router.push(`/workspace?${params.toString()}`)
  }}
  className="gap-2"
>
  <DollarSign className="h-4 w-4" />
  My Earnings
</Button>
```

### 3. Add Quick Link Button

**File**: `components/workspace/empty-workspace-view.tsx`

```tsx
<Button
  onClick={() => router.push('/workspace?view=template-earnings')}
  className="gap-2"
>
  <TrendingUp className="h-4 w-4" />
  View My Earnings
</Button>
```

---

## Component Integration

### Using the TemplateEarningsView Component

```tsx
import { TemplateEarningsView } from '@/components/workspace/template-earnings-view'

export function MyComponent({ userId }: { userId: string }) {
  return (
    <TemplateEarningsView userId={userId} />
  )
}
```

### Props

```typescript
interface TemplateEarningsViewProps {
  userId: string // Authenticated user's ID
}
```

---

## API Endpoints

### GET Creator Earnings
```
GET /api/marketplace/creator/earnings

Response:
{
  "total_earned": 1234.50,
  "total_paid_out": 1000.00,
  "pending_payout": 234.50,
  "balance": 234.50,
  "top_templates": [
    {
      "template_id": "uuid",
      "template_name": "React Template",
      "total_sales": 45,
      "total_revenue": 449.55,
      "rating": 4.8,
      "review_count": 12,
      "featured": true
    }
  ],
  "payout_history": [
    {
      "id": "uuid",
      "amount": 250.00,
      "status": "completed",
      "created_at": "2025-12-01T10:00:00Z",
      "completed_at": "2025-12-05T15:30:00Z"
    }
  ]
}
```

### POST Request Payout
```
POST /api/marketplace/creator/earnings

Body:
{
  "action": "request_payout",
  "amount": 250.00
}

Response:
{
  "success": true,
  "message": "Payout request submitted successfully",
  "payout_id": "uuid",
  "status": "processing",
  "estimated_delivery": "2-5 business days"
}
```

### POST Save Bank Details
```
POST /api/marketplace/creator/earnings

Body:
{
  "action": "save_bank_details",
  "bank_details": {
    "account_holder_name": "John Doe",
    "account_number": "0123456789",
    "routing_number": "021000021",
    "bank_name": "Chase Bank"
  }
}

Response:
{
  "success": true,
  "message": "Bank details saved successfully",
  "details": {
    "account_holder": "John Doe",
    "bank": "Chase Bank",
    "account_last_4": "6789"
  }
}
```

---

## Feature Checklist

### Current Implementation ✅
- [x] Earnings summary cards (4 metrics)
- [x] Request payout dialog with validation
- [x] Bank details dialog with secure input
- [x] Eye toggle for sensitive numbers
- [x] Top selling templates display
- [x] Payout history table
- [x] Minimum/maximum validation ($50 min)
- [x] Loading states
- [x] Error handling & toast notifications
- [x] Creator mode check
- [x] Mobile responsive design

### API Backend ✅
- [x] GET endpoint to fetch earnings data
- [x] POST endpoint to request payout
- [x] POST endpoint to save bank details
- [x] Database table support (creator_bank_details)
- [x] Wallet balance updates
- [x] Transaction logging

### Future Enhancements
- [ ] Tax form generation (1099)
- [ ] Direct bank connection (Plaid integration)
- [ ] Multi-currency support
- [ ] Scheduled payouts (automatic weekly/monthly)
- [ ] Analytics charts (earnings over time)
- [ ] Bulk operations (multiple payouts)
- [ ] International bank support
- [ ] Crypto payout option

---

## Database Tables Required

### creator_bank_details
```sql
CREATE TABLE creator_bank_details (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL (encrypted),
  routing_number TEXT NOT NULL (encrypted),
  bank_name TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(creator_id)
);
```

### marketplace_wallet (already exists, columns used)
```sql
-- Columns used:
- creator_id
- total_earned
- total_paid_out
- pending_payout
- balance
```

### payout_requests
```sql
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10, 2),
  status TEXT ('pending', 'processing', 'completed', 'failed'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## State Management

### Component State
```typescript
// Earnings data
const [earnings, setEarnings] = useState<CreatorEarnings | null>(null)
const [templateStats, setTemplateStats] = useState<TemplateStats[]>([])
const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([])

// UI state
const [loading, setLoading] = useState(true)
const [isCreator, setIsCreator] = useState(false)

// Payout modal state
const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
const [payoutAmount, setPayoutAmount] = useState<string>('')
const [isRequestingPayout, setIsRequestingPayout] = useState(false)

// Bank details modal state
const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false)
const [bankDetails, setBankDetails] = useState<BankDetails>({...})
const [isSavingBankDetails, setIsSavingBankDetails] = useState(false)
const [showAccountNumber, setShowAccountNumber] = useState(false)
const [showRoutingNumber, setShowRoutingNumber] = useState(false)
```

---

## Styling & UI

### Colors & Badges
```typescript
// Earnings cards
- Total Earned: Green (TrendingUp icon)
- Pending Payout: Blue (Clock icon)
- Already Paid Out: Green-dark (CheckCircle icon)
- Current Balance: Purple (DollarSign icon)

// Status badges
- Completed: Green badge
- Processing: Gray badge
- Failed: Red badge
- Pending: Light badge
```

### Responsive Layout
```
Desktop (1200px+):
  - 4 cards in a row (Earnings summary)
  - 2 columns for charts

Tablet (768px-1200px):
  - 2 cards per row
  - 1 column for tables

Mobile (<768px):
  - 1 card per row
  - Full width tables
  - Stacked dialogs
```

---

## Error Handling

### Common Errors & Responses

**Not a Creator**
```
Status: 403
Message: "User is not a creator"
Action: Show "Enable Creator Mode" button
```

**Insufficient Balance**
```
Status: 400
Message: "Insufficient pending balance. Available: $45.00"
Action: Show error toast, disable payout button
```

**Minimum Amount Not Met**
```
Status: 400
Message: "Minimum payout amount is $50.00"
Action: Show validation error, update button disabled state
```

**Bank Details Missing**
```
Status: 400
Message: "Bank details not found. Please add your bank details first."
Action: Auto-open bank details modal
```

**Unauthorized**
```
Status: 401
Message: "Unauthorized"
Action: Redirect to login
```

---

## Testing Checklist

### Manual Testing

- [ ] Test as non-creator (shows "Not a Creator Yet")
- [ ] Test with $0 balance (payout button disabled)
- [ ] Test with $40 balance (shows minimum warning)
- [ ] Test with $50+ balance (payout button enabled)
- [ ] Request payout with valid amount
- [ ] Request payout with amount > balance
- [ ] Request payout with amount < $50
- [ ] Save bank details
- [ ] Update existing bank details
- [ ] View masked account numbers
- [ ] Toggle visibility of account/routing numbers
- [ ] Refresh earnings data
- [ ] Test on mobile view
- [ ] Test keyboard accessibility
- [ ] Test loading states
- [ ] Test error handling

### API Testing

```bash
# Get earnings
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/marketplace/creator/earnings

# Request payout
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "request_payout",
    "amount": 250.00
  }' \
  https://your-app.com/api/marketplace/creator/earnings

# Save bank details
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "save_bank_details",
    "bank_details": {
      "account_holder_name": "John Doe",
      "account_number": "0123456789",
      "routing_number": "021000021",
      "bank_name": "Chase Bank"
    }
  }' \
  https://your-app.com/api/marketplace/creator/earnings
```

---

## Deployment Notes

### Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
```

### Database Migrations
Before deploying, run these migrations in Supabase:
1. Create `creator_bank_details` table
2. Create `payout_requests` table
3. Add RLS policies for creator_bank_details (only creator can read/write own)
4. Add RLS policies for payout_requests (only creator can read own)

### Post-Deployment
- [ ] Test payout workflow end-to-end
- [ ] Verify Stripe integration working
- [ ] Test bank detail encryption
- [ ] Monitor error logs for issues
- [ ] Send comms to creators about feature

---

## Support & Troubleshooting

### Common Issues

**Issue**: Component not showing  
**Solution**: Check URL parameter `?view=template-earnings`

**Issue**: Earnings not loading  
**Solution**: Verify user is creator (`profiles.is_creator = true`)

**Issue**: Payout button disabled  
**Solution**: Check pending_payout balance >= $50

**Issue**: Bank details won't save  
**Solution**: Validate all fields filled, check database RLS policies

---

## Performance Considerations

- Data refresh on mount and button click only
- Debounce input fields in bank details form
- Lazy load charts (if added later)
- Cache earnings data with 5-minute TTL
- Pagination for payout history (if > 50 items)

---

**Last Updated**: December 11, 2025  
**Status**: ✅ Production Ready

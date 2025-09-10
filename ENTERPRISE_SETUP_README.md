# Enterprise Forms Setup Guide

This guide explains how to set up and use the real Supabase integration for enterprise form submissions.

## Database Setup

### 1. Create Tables in Supabase

Run the SQL migration file in your Supabase dashboard:

```sql
-- File: supabase/migrations/001_create_enterprise_tables.sql
-- Copy and paste this entire file into your Supabase SQL Editor
```

The migration creates three tables:

#### `enterprise_demo_requests`
- Stores demo scheduling requests
- Fields: name, email, company, role, company_size, message, status, timestamps

#### `enterprise_contact_requests`
- Stores contact form submissions
- Fields: name, email, company, phone, message, status, timestamps

#### `enterprise_proposal_requests`
- Stores custom proposal requests
- Fields: name, email, company, company_size, requirements, timeline, status, timestamps

### 2. Row Level Security (RLS)

The tables are configured with RLS policies:
- **Anonymous users** can INSERT records (submit forms)
- **Authenticated users** can SELECT records (for admin dashboard)
- Automatic `updated_at` timestamp triggers

## Environment Variables

Ensure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Form Functionality

### Available Forms

1. **Schedule Enterprise Demo** (`/enterprise`)
   - Collects: Name, Email, Company, Role, Company Size, Message
   - Status tracking: pending → contacted → scheduled → completed

2. **Contact Sales Team** (`/enterprise`)
   - Collects: Name, Email, Company, Phone, Message
   - Status tracking: pending → contacted → qualified → closed

3. **Request Custom Proposal** (`/enterprise`)
   - Collects: Name, Email, Company, Company Size, Requirements, Timeline
   - Status tracking: pending → reviewing → sent → accepted → rejected

### Form Features

- ✅ **Real-time validation** with HTML5 form validation
- ✅ **Loading states** during submission
- ✅ **Error handling** with user-friendly messages
- ✅ **Success notifications** using Sonner toast
- ✅ **Form reset** after successful submission
- ✅ **Responsive design** for all screen sizes

## API Usage

### Service Methods

The `enterpriseService` provides these methods:

```typescript
// Submit forms
await enterpriseService.submitDemoRequest(formData)
await enterpriseService.submitContactRequest(formData)
await enterpriseService.submitProposalRequest(formData)

// Admin functions (requires authentication)
await enterpriseService.getDemoRequests()
await enterpriseService.getContactRequests()
await enterpriseService.getProposalRequests()

// Update status (requires authentication)
await enterpriseService.updateDemoRequestStatus(id, 'contacted')
await enterpriseService.updateContactRequestStatus(id, 'qualified')
await enterpriseService.updateProposalRequestStatus(id, 'sent')
```

### Response Format

All methods return:
```typescript
{
  data: Record | null,
  error: Error | null
}
```

## Form Validation

### Required Fields

- **All Forms**: name, email, company
- **Demo Form**: role, company_size
- **Contact Form**: message
- **Proposal Form**: company_size, requirements, timeline

### Data Types

- `name`: string (required)
- `email`: valid email format (required)
- `company`: string (required)
- `phone`: optional string
- `message`: optional text
- `role`: string (demo only)
- `company_size`: enum ['1-50', '51-200', '201-1000', '1000+']
- `requirements`: text (proposal only)
- `timeline`: enum ['ASAP', '1-3 months', '3-6 months', '6+ months']

## Status Management

### Demo Request Statuses
- `pending`: Initial state
- `contacted`: Sales team reached out
- `scheduled`: Demo scheduled
- `completed`: Demo completed

### Contact Request Statuses
- `pending`: Initial state
- `contacted`: Initial contact made
- `qualified`: Lead qualified
- `closed`: Deal closed or disqualified

### Proposal Request Statuses
- `pending`: Initial state
- `reviewing`: Under review by sales team
- `sent`: Proposal sent to client
- `accepted`: Proposal accepted
- `rejected`: Proposal rejected

## Admin Dashboard

Create an admin dashboard to manage submissions:

```typescript
// Example admin component
const AdminDashboard = () => {
  const [demoRequests, setDemoRequests] = useState([])
  const [contactRequests, setContactRequests] = useState([])
  const [proposalRequests, setProposalRequests] = useState([])

  useEffect(() => {
    loadAllRequests()
  }, [])

  const loadAllRequests = async () => {
    const [demoRes, contactRes, proposalRes] = await Promise.all([
      enterpriseService.getDemoRequests(),
      enterpriseService.getContactRequests(),
      enterpriseService.getProposalRequests()
    ])

    if (demoRes.data) setDemoRequests(demoRes.data)
    if (contactRes.data) setContactRequests(contactRes.data)
    if (proposalRes.data) setProposalRequests(proposalRes.data)
  }

  const updateStatus = async (type, id, status) => {
    let result
    switch (type) {
      case 'demo':
        result = await enterpriseService.updateDemoRequestStatus(id, status)
        break
      case 'contact':
        result = await enterpriseService.updateContactRequestStatus(id, status)
        break
      case 'proposal':
        result = await enterpriseService.updateProposalRequestStatus(id, status)
        break
    }

    if (result.error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated successfully')
      loadAllRequests() // Refresh data
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Enterprise Leads Dashboard</h1>

      {/* Demo Requests Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Demo Requests ({demoRequests.length})</h2>
        {/* Render demo requests table */}
      </div>

      {/* Contact Requests Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Requests ({contactRequests.length})</h2>
        {/* Render contact requests table */}
      </div>

      {/* Proposal Requests Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Proposal Requests ({proposalRequests.length})</h2>
        {/* Render proposal requests table */}
      </div>
    </div>
  )
}
```

## Email Integration

To send confirmation emails when forms are submitted, you can:

1. **Use Supabase Edge Functions** for email sending
2. **Integrate with email services** like SendGrid, Mailgun, or Resend
3. **Create database triggers** to send emails on INSERT

Example Edge Function:

```typescript
// supabase/functions/send-confirmation-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { record } = await req.json()

  // Send confirmation email using your email service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'enterprise@yourcompany.com',
  //   to: record.email,
  //   subject: 'Demo Request Received',
  //   html: `Thank you ${record.name}...`
  // })

  return new Response(JSON.stringify({ success: true }))
})
```

## Monitoring & Analytics

### Track Form Performance

```sql
-- Query to get form submission stats
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM enterprise_demo_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
```

### Conversion Funnel

```sql
-- Track conversion from contact to closed deal
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM enterprise_contact_requests
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'closed' THEN 4
  END
```

## Security Considerations

1. **Input Validation**: All forms include client-side and server-side validation
2. **Rate Limiting**: Consider implementing rate limiting for form submissions
3. **Spam Protection**: Add CAPTCHA or honeypot fields for spam prevention
4. **Data Encryption**: Sensitive data is encrypted at rest in Supabase
5. **Access Control**: RLS ensures only authorized users can read submissions

## Testing

### Test Form Submissions

```typescript
// Test data for demo form
const testDemoData = {
  name: 'John Doe',
  email: 'john.doe@company.com',
  company: 'TechCorp',
  role: 'CTO',
  companySize: '201-1000',
  message: 'We are interested in your enterprise AI development platform.'
}

// Test submission
const result = await enterpriseService.submitDemoRequest(testDemoData)
console.log('Test result:', result)
```

### Test Admin Functions

```typescript
// Test fetching all requests (requires authentication)
const demoRequests = await enterpriseService.getDemoRequests()
const contactRequests = await enterpriseService.getContactRequests()
const proposalRequests = await enterpriseService.getProposalRequests()

console.log('All requests:', {
  demos: demoRequests.data?.length || 0,
  contacts: contactRequests.data?.length || 0,
  proposals: proposalRequests.data?.length || 0
})
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure user is authenticated for read operations
   - Check that INSERT policies allow anonymous access

2. **Form Submission Errors**
   - Verify Supabase connection
   - Check network connectivity
   - Validate form data before submission

3. **Database Connection Issues**
   - Confirm environment variables are set correctly
   - Check Supabase project status
   - Verify table permissions

4. **Email Integration Issues**
   - Test email service API keys
   - Check Edge Function logs
   - Verify email templates

## Next Steps

1. **Set up email notifications** for form submissions
2. **Create admin dashboard** for managing leads
3. **Add analytics tracking** for form performance
4. **Implement lead scoring** based on form responses
5. **Set up CRM integration** (Salesforce, HubSpot, etc.)

## Support

For issues with the enterprise forms setup:
1. Check the Supabase dashboard for table creation errors
2. Verify environment variables are configured correctly
3. Test form submissions in the browser developer console
4. Check network tab for API request errors

The system is designed to be production-ready with proper error handling, validation, and security measures.

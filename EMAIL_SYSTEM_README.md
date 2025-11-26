# PiPilot Email System Documentation

## Overview

PiPilot uses a modern Node.js email system powered by **Nodemailer** with **Zoho SMTP** for reliable email delivery. This replaces the previous PHP-based email system with a faster, more maintainable solution.

## Configuration

### SMTP Settings
- **Host**: smtp.zoho.com
- **Port**: 465 (SSL/TLS)
- **Security**: SSL enabled
- **Authentication**: hello@pipilot.dev / [Password protected]

### Email Service Features

#### 1. Transactional Emails
Used for account-related communications:
- Password resets
- Account verification
- System notifications
- Order confirmations

#### 2. Marketing Emails
Used for promotional content:
- Product updates
- Newsletters
- Feature announcements
- Automatic unsubscribe links

#### 3. Custom Emails
Full control over email composition with support for:
- CC/BCC recipients
- Custom reply-to addresses
- File attachments
- HTML and plain text content

## API Usage

### Endpoint
```
POST /api/email/send
```

### Request Format
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "text": "Plain text fallback",
  "type": "transactional", // "transactional" | "marketing" | "custom"
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "replyTo": "reply@example.com",
  "attachments": [
    {
      "filename": "file.pdf",
      "content": "base64-encoded-content",
      "encoding": "base64"
    }
  ]
}
```

### Response Format
```json
{
  "success": true,
  "messageId": "<unique-message-id@pipilot.dev>",
  "message": "Email sent successfully"
}
```

### Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error (dev mode only)"
}
```

## Email Service Utility

The `lib/email-service.ts` provides convenient functions for sending emails:

### sendTransactionalEmail()
```typescript
import { sendTransactionalEmail } from '@/lib/email-service';

await sendTransactionalEmail({
  to: 'user@example.com',
  subject: 'Welcome to PiPilot!',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome to PiPilot!'
});
```

### sendMarketingEmail()
```typescript
import { sendMarketingEmail } from '@/lib/email-service';

await sendMarketingEmail({
  to: 'subscriber@example.com',
  subject: 'New Features Available!',
  html: '<h1>Check out our new features!</h1>',
  text: 'Check out our new features!',
  unsubscribeUrl: 'https://pipilot.dev/unsubscribe'
});
```

### sendEmail() - Full Control
```typescript
import { sendEmail } from '@/lib/email-service';

await sendEmail({
  to: 'recipient@example.com',
  subject: 'Custom Email',
  html: '<h1>Custom Content</h1>',
  cc: ['cc@example.com'],
  attachments: [...]
});
```

## Testing

### Unit Tests
Run the email service tests:
```bash
node test-email-service-simple.js
```

### API Tests
Test the email API endpoint:
```bash
node test-email-api.js
```

Make sure your development server is running (`npm run dev`) before running API tests.

### Manual Testing
Send a test email via API:
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@pipilot.dev",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "type": "transactional"
  }'
```

## Error Handling

The email system includes comprehensive error handling for common SMTP issues:

- **EAUTH**: Authentication failed
- **ECONNREFUSED**: Connection refused
- **ETIMEDOUT**: Connection timeout
- **Invalid recipient**: Bad email address

## Security Considerations

- SMTP credentials are stored securely
- No sensitive data is logged in production
- Rate limiting should be implemented at the application level
- Email content validation prevents injection attacks

## Migration from PHP

### Before (PHP)
```php
// Old PHP email system
mail($to, $subject, $message, $headers);
```

### After (Node.js)
```javascript
// New Node.js email system
await sendTransactionalEmail({
  to: recipient,
  subject: subject,
  html: htmlContent
});
```

### Benefits of Migration
- ✅ Faster delivery (Node.js vs PHP)
- ✅ Better error handling
- ✅ TypeScript type safety
- ✅ Modern async/await patterns
- ✅ Comprehensive logging
- ✅ Attachment support
- ✅ Multiple email types

## Monitoring

Email delivery is logged with:
- Message ID
- Recipient
- Subject
- Timestamp
- Success/failure status

Check application logs for email delivery status and troubleshoot issues.

## Support

For email-related issues:
1. Check SMTP credentials
2. Verify recipient email addresses
3. Review application logs
4. Test with the provided test scripts
5. Contact Zoho support if SMTP issues persist
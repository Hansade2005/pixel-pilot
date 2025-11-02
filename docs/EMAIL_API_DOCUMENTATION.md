# PiPilot Email API Documentation

## Overview

The PiPilot Email API is a comprehensive email service that allows you to send various types of emails through a simple REST API. It uses PHPMailer with SMTP authentication for reliable email delivery on Namecheap hosting.

**Base URL:** `https://humanityatheartintl.org/email-api.php`

**Method:** `POST`

**Content-Type:** `application/json`

## Authentication

Currently, no authentication is required for the API. However, consider implementing API keys for production use.

## Request Format

All requests must be sent as POST with JSON payload:

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // request parameters
  })
});
```

## Request Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email address (must be valid email format) |
| `subject` | string | Email subject line |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Email type (see supported types below). Default: `"general"` |
| `message` | string | Email content (required for `general`, `marketing`, `test` types) |
| `from` | string | Custom sender email (overrides default) |
| `cc` | string | CC recipient email |
| `bcc` | string | BCC recipient email |
| `profile_icon` | string | URL to sender profile icon/avatar image |

### Email Types

The API supports the following predefined email types:

| Type | Description | Requires Message | Template |
|------|-------------|------------------|----------|
| `general` | Custom email content | ✅ Yes | Uses provided message |
| `test` | Test email | ✅ Yes | Uses provided message |
| `marketing` | Marketing campaign | ✅ Yes | Uses provided message |
| `invitation` | Team invitation | ❌ No | Pre-built invitation template |
| `welcome` | Welcome message | ❌ No | Pre-built welcome template |
| `notification` | General notification | ❌ No | Pre-built notification template |
| `security` | Security alert | ❌ No | Pre-built security template |
| `newsletter` | Newsletter | ❌ No | Pre-built newsletter template |
| `feature` | Feature announcement | ❌ No | Pre-built feature template |
| `billing` | Billing/Payment | ❌ No | Pre-built billing template |
| `support` | Support response | ❌ No | Pre-built support template |

## Email Type Parameters

### Invitation Email Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invitee_name` | string | No | Name of the person being invited (default: "there") |
| `organization_name` | string | No | Name of the organization/team (default: "the team") |
| `inviter_name` | string | No | Name of the person sending the invitation (default: "someone") |
| `accept_url` | string | No | URL for accepting the invitation (default: "#") |
| `role` | string | No | Role being assigned (default: "member") |

### Welcome Email Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_name` | string | No | Name of the new user |
| `organization_name` | string | No | Name of the organization/workspace |

### Marketing Email Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | HTML content for the marketing email |

### Security Alert Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Title of the security alert |
| `content` | string | No | HTML content describing the security event |
| `action_url` | string | No | URL for security action (e.g., change password) |

### Newsletter Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Newsletter title |
| `content` | string | No | HTML content for the newsletter |
| `unsubscribe_url` | string | No | URL for unsubscribing from newsletter |

### Feature Announcement Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Feature announcement title |
| `feature_name` | string | No | Name of the new feature |
| `content` | string | No | HTML content describing the feature |
| `try_url` | string | No | URL to try the new feature |

### Billing Notification Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Billing notification title |
| `content` | string | No | HTML content for billing details |
| `amount` | string | No | Payment amount (e.g., "$29.99") |
| `action_url` | string | No | URL for billing management |

### Support Response Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Support ticket title |
| `content` | string | No | HTML content with support response |
| `ticket_id` | string | No | Support ticket ID (e.g., "#12345") |
| `support_url` | string | No | URL to view the support ticket |

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "type": "email_type",
    "timestamp": "2025-10-26 12:00:00"
  }
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error description",
  "data": {
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "type": "email_type"
  }
}
```

## Examples

### 1. Send a Test Email

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'Test Email',
    type: 'test',
    message: 'This is a test email from PiPilot API!'
  })
});

const result = await response.json();
console.log(result);
```

### 2. Send a Welcome Email

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'newuser@example.com',
    subject: 'Welcome to Pixel Pilot!',
    type: 'welcome',
    user_name: 'John Doe',
    organization_name: 'Acme Corp',
    profile_icon: 'https://pipilot.dev/images/avatar.png'
  })
});

const result = await response.json();
console.log(result);
```

### 3. Send a Team Invitation

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'invitee@example.com',
    subject: 'You\'re invited to join our team!',
    type: 'invitation',
    invitee_name: 'John Doe',
    organization_name: 'Acme Corp',
    inviter_name: 'Jane Smith',
    accept_url: 'https://app.pixelpilot.dev/accept-invite/123',
    role: 'developer'
  })
});

const result = await response.json();
console.log(result);
```

### 4. Send a Marketing Email

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'subscriber@example.com',
    subject: 'Discover New Features in PiPilot',
    type: 'marketing',
    message: `
      <h1>Exciting New Features!</h1>
      <p>We're thrilled to announce our latest updates...</p>
      <a href="https://pixelpilot.dev/features">Learn More</a>
    `
  })
});

const result = await response.json();
console.log(result);
```

### 5. Send a Security Alert

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Security Alert: Unusual Login Activity',
    type: 'security',
    title: 'Unusual Login Activity Detected',
    content: '<p>We detected unusual login activity on your account from a new device.</p><p>If this was you, no action is needed. If you don\'t recognize this activity, please secure your account immediately.</p>',
    action_url: 'https://pipilot.dev/security'
  })
});

const result = await response.json();
console.log(result);
```

### 6. Send a Newsletter

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'subscriber@example.com',
    subject: 'Monthly Newsletter: AI Coding Trends',
    type: 'newsletter',
    title: 'AI Coding Trends for October 2025',
    content: '<h3>🚀 What\'s New This Month</h3><p>Discover the latest AI-powered coding tools...</p><h3>📈 Industry Insights</h3><p>Learn about the future of AI-assisted programming...</p>',
    unsubscribe_url: 'https://pipilot.dev/unsubscribe'
  })
});

const result = await response.json();
console.log(result);
```

### 7. Send a Feature Announcement

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'New Feature: AI Code Review Assistant',
    type: 'feature',
    title: 'AI Code Review Assistant is now available!',
    feature_name: 'AI Code Review Assistant',
    content: '<p>Our new AI Code Review Assistant automatically analyzes your code...</p><ul><li>Real-time code analysis</li><li>Security vulnerability detection</li><li>Performance optimization suggestions</li></ul>',
    try_url: 'https://pipilot.dev/features/code-review'
  })
});

const result = await response.json();
console.log(result);
```

### 8. Send a Billing Notification

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Payment Confirmation',
    type: 'billing',
    title: 'Payment Processed Successfully',
    content: '<p>Your payment of $29.99 for the Pro Monthly plan has been processed successfully.</p><p>Your next billing date is November 25, 2025.</p>',
    amount: '$29.99',
    action_url: 'https://pipilot.dev/billing'
  })
});

const result = await response.json();
console.log(result);
```

### 9. Send a Support Response

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Support Ticket #12345 - Update',
    type: 'support',
    title: 'Your support ticket has been updated',
    content: '<p>Our support team has reviewed your issue and provided a solution.</p><p>The problem was related to a configuration setting...</p>',
    ticket_id: '#12345',
    support_url: 'https://pipilot.dev/support/ticket/12345'
  })
});

const result = await response.json();
console.log(result);
```

### 10. Send Email with CC/BCC

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'primary@example.com',
    cc: 'cc@example.com',
    bcc: 'bcc@example.com',
    subject: 'Important Update',
    type: 'notification'
  })
});

const result = await response.json();
console.log(result);
```

## Error Codes

| HTTP Status | Error Description |
|-------------|-------------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 405 | Method Not Allowed (not POST) |
| 500 | Internal Server Error (SMTP failure) |

### Common Error Messages

- `"Invalid JSON data"` - Request body is not valid JSON
- `"Missing required field: {field}"` - Required parameter missing
- `"Invalid recipient email address"` - Invalid email format
- `"SMTP configuration incomplete"` - SMTP password not configured
- `"Failed to send email: {error}"` - SMTP delivery failure

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

## Logging

All email attempts are logged to:
- `logs/email_log.txt` - Success/failure records
- `email_error.log` - Detailed error logs

## Testing

Use the provided test script:

```bash
# Test all email types
node test-email-api.js your-email@example.com

# Test specific type
node test-email-api.js your-email@example.com --type welcome
```

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Email Validation**: Email addresses are validated using PHP filters
3. **SMTP Security**: Uses TLS encryption for email transmission
4. **Error Handling**: Sensitive information is not exposed in error messages

## Production Deployment

For production use:

1. Remove debug settings (`error_reporting`, `display_errors`)
2. Implement API key authentication
3. Add rate limiting
4. Set up monitoring and alerts
5. Configure proper SPF/DKIM records
6. Use HTTPS only

## Support

For issues or questions:
- Check server logs: `email_error.log`
- Verify SMTP configuration in `email-config.php`
- Test with the provided test script

## Version History

- **v1.0**: Initial release with PHPMailer integration
- Support for 9 email types with branded templates
- SMTP authentication for Namecheap hosting
- Comprehensive error handling and logging
- Professional PiPilot branding across all templates

### Common Error Messages

- `"Invalid JSON data"` - Request body is not valid JSON
- `"Missing required field: {field}"` - Required parameter missing
- `"Invalid recipient email address"` - Invalid email format
- `"SMTP configuration incomplete"` - SMTP password not configured
- `"Failed to send email: {error}"` - SMTP delivery failure

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

## Logging

All email attempts are logged to:
- `logs/email_log.txt` - Success/failure records
- `email_error.log` - Detailed error logs

## Testing

Use the provided test script:

```bash
# Test all email types
node test-email-api.js your-email@example.com

# Test specific type
node test-email-api.js your-email@example.com --type welcome
```

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Email Validation**: Email addresses are validated using PHP filters
3. **SMTP Security**: Uses TLS encryption for email transmission
4. **Error Handling**: Sensitive information is not exposed in error messages

## Production Deployment

For production use:

1. Remove debug settings (`error_reporting`, `display_errors`)
2. Implement API key authentication
3. Add rate limiting
4. Set up monitoring and alerts
5. Configure proper SPF/DKIM records
6. Use HTTPS only

## Support

For issues or questions:
- Check server logs: `email_error.log`
- Verify SMTP configuration in `email-config.php`
- Test with the provided test script

## Version History

- **v1.0**: Initial release with PHPMailer integration
- Support for 10+ email types
- SMTP authentication for Namecheap hosting
- Comprehensive error handling and logging
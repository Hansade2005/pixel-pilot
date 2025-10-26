# Email API Quick Reference

## Base URL
```
https://humanityatheartintl.org/email-api.php
```

## Method
```
POST
```

## Headers
```
Content-Type: application/json
```

## Quick Examples

### Test Email
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'Test Email',
    type: 'test',
    message: 'Hello World!'
  })
});
```

### Welcome Email
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome!',
    type: 'welcome',
    user_name: 'John Doe',
    organization_name: 'My Workspace'
  })
});
```

### Team Invitation
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'invitee@example.com',
    subject: 'Team Invitation',
    type: 'invitation',
    invitee_name: 'John',
    organization_name: 'My Team',
    inviter_name: 'Jane',
    accept_url: 'https://app.com/accept/123',
    role: 'developer'
  })
});
```

### Security Alert
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Security Alert',
    type: 'security',
    title: 'Unusual Login Activity',
    content: '<p>We detected unusual login activity...</p>',
    action_url: 'https://pipilot.dev/security'
  })
});
```

### Newsletter
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'subscriber@example.com',
    subject: 'Monthly Newsletter',
    type: 'newsletter',
    title: 'AI Coding Trends',
    content: '<h3>🚀 What\'s New</h3><p>Discover latest AI tools...</p>',
    unsubscribe_url: 'https://pipilot.dev/unsubscribe'
  })
});
```

### Feature Announcement
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'New Feature Available',
    type: 'feature',
    title: 'AI Code Review Assistant',
    feature_name: 'AI Code Review',
    content: '<p>Automatically analyze your code...</p>',
    try_url: 'https://pipilot.dev/features/code-review'
  })
});
```

### Billing Notification
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Payment Confirmation',
    type: 'billing',
    title: 'Payment Processed',
    content: '<p>Your payment has been processed...</p>',
    amount: '$29.99',
    action_url: 'https://pipilot.dev/billing'
  })
});
```

### Support Response
```javascript
fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Support Update',
    type: 'support',
    title: 'Ticket Updated',
    content: '<p>Our support team has reviewed...</p>',
    ticket_id: '#12345',
    support_url: 'https://pipilot.dev/support/ticket/12345'
  })
});
```

## Email Types

| Type | Message Required | Description |
|------|------------------|-------------|
| `general` | ✅ | Custom content |
| `test` | ✅ | Test emails |
| `marketing` | ✅ | Marketing campaigns |
| `invitation` | ❌ | Team invitations |
| `welcome` | ❌ | Welcome messages |
| `notification` | ❌ | General notifications |
| `security` | ❌ | Security alerts |
| `newsletter` | ❌ | Newsletters |
| `feature` | ❌ | Feature announcements |
| `billing` | ❌ | Payment confirmations |
| `support` | ❌ | Support responses |

## Parameters

### Required
- `to` (string): Recipient email
- `subject` (string): Email subject

### Optional
- `type` (string): Email type (default: "general")
- `message` (string): Email content (required for some types)
- `from` (string): Custom sender email
- `cc` (string): CC recipient
- `bcc` (string): BCC recipient
- `profile_icon` (string): URL to sender profile icon/avatar image

### Type-Specific Parameters

#### Invitation
- `invitee_name`, `organization_name`, `inviter_name`, `accept_url`, `role`

#### Welcome
- `user_name`, `organization_name`

#### Security
- `title`, `content`, `action_url`

#### Newsletter
- `title`, `content`, `unsubscribe_url`

#### Feature
- `title`, `feature_name`, `content`, `try_url`

#### Billing
- `title`, `content`, `amount`, `action_url`

#### Support
- `title`, `content`, `ticket_id`, `support_url`

## Response Codes

- `200`: Success
- `400`: Bad request (invalid parameters)
- `405`: Method not allowed
- `500`: Server error (SMTP failure)

## Testing

```bash
# Test all types
node test-email-api.js your-email@example.com

# Test specific type
node test-email-api.js your-email@example.com --type welcome
```

## cURL Examples

### Basic Test
```bash
curl -X POST https://humanityatheartintl.org/email-api.php \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "type": "test",
    "message": "Hello!"
  }'
```

### Welcome Email
```bash
curl -X POST https://humanityatheartintl.org/email-api.php \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome!",
    "type": "welcome",
    "user_name": "John Doe",
    "organization_name": "My Workspace"
  }'
```

### Team Invitation
```bash
curl -X POST https://humanityatheartintl.org/email-api.php \
  -H "Content-Type: application/json" \
  -d '{
    "to": "invitee@example.com",
    "subject": "Team Invitation",
    "type": "invitation",
    "invitee_name": "John",
    "organization_name": "My Team",
    "inviter_name": "Jane",
    "accept_url": "https://app.com/accept/123",
    "role": "developer"
  }'
```

## Error Handling

```javascript
const response = await fetch('https://humanityatheartintl.org/email-api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
});

const result = await response.json();

if (result.success) {
  console.log('Email sent successfully!');
} else {
  console.error('Failed to send email:', result.error);
}
```

## Node.js Helper Function

```javascript
async function sendEmail(emailData) {
  const response = await fetch('https://humanityatheartintl.org/email-api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  });

  return await response.json();
}

// Usage
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  type: 'welcome',
  user_name: 'John Doe',
  organization_name: 'My Workspace'
});
```

## Python Helper Function

```python
import requests
import json

def send_email(email_data):
    url = 'https://humanityatheartintl.org/email-api.php'
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, json=email_data, headers=headers)
    return response.json()

# Usage
result = send_email({
    'to': 'user@example.com',
    'subject': 'Welcome!',
    'type': 'welcome',
    'user_name': 'John Doe',
    'organization_name': 'My Workspace'
})
```

## PHP Helper Function

```php
function sendEmail($emailData) {
    $url = 'https://humanityatheartintl.org/email-api.php';
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($emailData)
        ]
    ];
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    return json_decode($result, true);
}

// Usage
$result = sendEmail([
    'to' => 'user@example.com',
    'subject' => 'Welcome!',
    'type' => 'welcome',
    'user_name' => 'John Doe',
    'organization_name' => 'My Workspace'
]);
```</content>
<parameter name="filePath">c:\Users\DELL\Downloads\ai-app-builder\EMAIL_API_QUICK_REFERENCE.md
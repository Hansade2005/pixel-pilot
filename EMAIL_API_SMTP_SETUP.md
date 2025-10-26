# Email API Setup for Namecheap Hosting

## Problem
Your email API was failing with "Failed to send email. Please check server mail configuration" because Namecheap shared hosting disables PHP's `mail()` function and requires SMTP authentication for outgoing emails.

## Solution
The email API has been updated to use SMTP authentication instead of PHP's built-in `mail()` function.

## Setup Instructions

### 1. Configure SMTP Settings

Edit the `email-config.php` file and set your SMTP password:

```php
$smtp_config = [
    'host' => 'mail.humanityatheartintl.org', // Your domain's mail server
    'port' => 587, // 587 for TLS, 465 for SSL
    'username' => 'noreply_pipilot@humanityatheartintl.org', // Your email address
    'password' => 'YOUR_SMTP_PASSWORD_HERE', // Set this!
    'encryption' => 'tls', // 'tls' or 'ssl'
    'from_email' => 'noreply_pipilot@humanityatheartintl.org',
    'from_name' => 'PiPilot'
];
```

### 2. Get Your SMTP Password

For Namecheap hosting:
- **SMTP Server**: `mail.yourdomain.com` (e.g., `mail.humanityatheartintl.org`)
- **Port**: `587` (TLS) or `465` (SSL)
- **Username**: Your full email address (e.g., `noreply_pipilot@humanityatheartintl.org`)
- **Password**: Your email account password

If you have 2FA enabled on your email account, you may need to create an "App Password" or contact Namecheap support.

### 3. Security

- Make sure `email-config.php` is not accessible via the web (place it above `public_html` if possible)
- Set file permissions: `chmod 600 email-config.php`
- Never commit `email-config.php` to version control with real passwords

### 4. Test the Setup

Run your test script again:
```bash
node test-email-api.js your-email@example.com
```

### 5. Troubleshooting

If you still get errors:

1. **Check server error logs** in your Namecheap cPanel
2. **Verify SMTP settings** with your hosting provider
3. **Test SMTP connection** manually using telnet:
   ```bash
   telnet mail.yourdomain.com 587
   ```
4. **Contact Namecheap support** if SMTP is blocked

### 6. Alternative Solutions

If SMTP continues to fail, consider:
- Using a transactional email service like SendGrid, Mailgun, or Amazon SES
- Setting up a local SMTP server
- Using Namecheap's email API if available

## Files Modified

- `email-api.php`: Updated to use SMTP instead of `mail()`
- `email-config.php`: New configuration file for SMTP settings

## Testing

The API now returns more specific error messages to help with debugging. Check the response for details about what went wrong.
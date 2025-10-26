# Email API Setup for Namecheap Hosting with PHPMailer

## Problem
Your email API was failing with "Failed to send email. Please check server mail configuration" because Namecheap shared hosting disables PHP's `mail()` function and requires SMTP authentication for outgoing emails.

## Solution
The email API has been updated to use PHPMailer with SMTP authentication instead of PHP's built-in `mail()` function.

## Setup Instructions

### 1. Verify PHPMailer Installation

Make sure PHPMailer is installed on your Namecheap server. You should have:
- `vendor/` directory with PHPMailer files
- `vendor/autoload.php` file

If not installed, run:
```bash
composer require phpmailer/phpmailer
```

### 2. Configure SMTP Settings

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

### 3. Get Your SMTP Password

For Namecheap hosting:
- **SMTP Server**: `mail.yourdomain.com` (e.g., `mail.humanityatheartintl.org`)
- **Port**: `587` (TLS) or `465` (SSL)
- **Username**: Your full email address (e.g., `noreply@humanityatheartintl.org`)
- **Password**: Your email account password

If you have 2FA enabled on your email account, you may need to create an "App Password" or contact Namecheap support.

### 4. Security

- Make sure `email-config.php` is not accessible via the web (should be above `public_html` if possible)
- Set file permissions: `chmod 600 email-config.php`
- Never commit `email-config.php` to version control with real passwords

### 5. Test the Setup

Run your test script:
```bash
node test-email-api.js hanscadx8@gmail.com
```

### 6. Troubleshooting

If you still get errors:

1. **Check server error logs** in your Namecheap cPanel and the `email_error.log` file
2. **Verify SMTP settings** with your hosting provider
3. **Check PHPMailer installation** - ensure `vendor/autoload.php` exists
4. **Test SMTP connection** manually using telnet:
   ```bash
   telnet mail.yourdomain.com 587
   ```
5. **Contact Namecheap support** if SMTP is blocked

### 7. Alternative Solutions

If PHPMailer continues to fail, consider:
- Using a transactional email service like SendGrid, Mailgun, or Amazon SES
- Setting up a local SMTP server
- Using Namecheap's email API if available

## Files Modified

- `email-api.php`: Updated to use PHPMailer instead of `mail()`
- `email-config.php`: SMTP configuration file

## Testing

The API now returns more specific error messages to help with debugging. Check the response and `email_error.log` for details about what went wrong.
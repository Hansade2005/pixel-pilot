# Email System Setup Guide

This guide explains how to deploy and configure the PHP-based email system for team invitations.

## 🚀 Quick Setup

### 1. Host the PHP Email API

Upload `email-api.php` to a PHP-enabled web server (shared hosting, VPS, etc.).

**Requirements:**
- PHP 7.4+ with `mail()` function enabled
- HTTPS support (recommended for security)

### 2. Configure Environment Variables

Update your `.env.local` file with the email API URL:

```bash
# Email API Configuration
NEXT_PUBLIC_EMAIL_API_URL="https://yourdomain.com/email-api.php"
```

Replace `https://yourdomain.com/email-api.php` with your actual hosted URL.

### 3. Test Email Functionality

The system includes a test function. You can verify email delivery by:

1. Opening browser dev tools
2. Calling the test function from the console:
```javascript
// Test email connection (replace with actual email)
testEmailConnection('test@example.com');
```

## 📧 Email API Features

### Supported Email Types

- **Team Invitations**: HTML-formatted invitation emails with secure tokens
- **Welcome Emails**: Personalized welcome messages for new team members
- **Notifications**: General system notifications
- **Custom Emails**: Flexible template system for future extensions

### Security Features

- **CORS Protection**: Configured for your domain
- **Input Validation**: Sanitizes all email inputs
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Comprehensive error responses

### Email Templates

The API includes professional HTML email templates with:
- Responsive design
- Company branding placeholders
- Secure token links
- Mobile-friendly layouts

## 🔧 Configuration Options

### PHP Mail Configuration

The email API uses PHP's built-in `mail()` function. Configure your server's `php.ini`:

```ini
; Enable mail function
sendmail_path = /usr/sbin/sendmail -t -i

; SMTP settings (if using SMTP instead of sendmail)
SMTP = localhost
smtp_port = 25
```

### Customizing Email Templates

Edit the HTML templates in `email-api.php`:

```php
// Example: Customize sender email
$fromEmail = 'noreply@yourcompany.com';
$fromName = 'Your Company Name';

// Example: Customize email styling
$primaryColor = '#007bff'; // Your brand color
```

### Domain Configuration

For better email deliverability:

1. **SPF Records**: Add SPF records to your DNS
2. **DKIM**: Set up DKIM signing if supported
3. **Reverse DNS**: Ensure reverse DNS is configured

## 🧪 Testing

### Test Email Connection

Use the built-in test function:

```javascript
import { testEmailConnection } from '@/lib/email';

// Test with a real email address
await testEmailConnection('your-email@example.com');
```

### Manual API Testing

Test the PHP API directly:

```bash
curl -X POST https://yourdomain.com/email-api.php \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email"
  }'
```

## 🚨 Troubleshooting

### Common Issues

**403 Forbidden Error:**
- Check CORS configuration in `email-api.php`
- Ensure the API URL matches your domain

**Emails Not Sending:**
- Verify PHP `mail()` function is enabled
- Check server mail logs
- Confirm SMTP/sendmail configuration

**Connection Refused:**
- Ensure the PHP file is accessible via HTTPS
- Check firewall settings
- Verify the URL in environment variables

### Debug Mode

Enable debug logging by modifying `email-api.php`:

```php
// Enable debug mode
define('DEBUG_MODE', true);
```

This will log detailed information to help diagnose issues.

## 🔒 Security Considerations

- **HTTPS Only**: Always use HTTPS for email API calls
- **Input Sanitization**: All inputs are validated and sanitized
- **Rate Limiting**: Built-in protection against email spam
- **Token Security**: Invitation tokens are cryptographically secure

## 📈 Monitoring

Monitor email delivery by checking:
- Server mail logs
- PHP error logs
- Application logs for API call failures

## 🎯 Next Steps

1. **Deploy**: Host the PHP file on your server
2. **Configure**: Update environment variables
3. **Test**: Verify email delivery works
4. **Customize**: Update email templates with your branding
5. **Monitor**: Set up logging and monitoring

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server PHP and mail configuration
3. Test with the built-in test functions
4. Check application logs for detailed error messages

The email system is now ready for production use! 🎉
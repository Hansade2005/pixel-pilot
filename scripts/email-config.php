<?php
/**
 * Email SMTP Configuration for PiPilot
 * This file contains SMTP settings for Namecheap hosting
 */

// SMTP Configuration
$smtp_config = [
    'host' => 'mail.humanityatheartintl.org', // Your domain's mail server
    'port' => 587, // 587 for TLS, 465 for SSL
    'username' => 'noreply_pipilot@humanityatheartintl.org', // SMTP username (usually your email)
    'password' => 'Mnbvcxzl@5', // SET YOUR SMTP PASSWORD HERE
    'encryption' => 'tls', // 'tls' or 'ssl'
    'from_email' => 'noreply_pipilot@humanityatheartintl.org', // Generic "From" address
    'from_name' => 'PiPilot',
    'profile_icon' => 'https://humanityatheartintl.org/pipilot-avatar.png' // Profile icon/avatar URL
];

/**
 * IMPORTANT SETUP INSTRUCTIONS:
 *
 * 1. Set your SMTP password above in the 'password' field
 * 2. For Namecheap hosting, your SMTP settings are typically:
 *    - Host: mail.yourdomain.com
 *    - Port: 587 (TLS) or 465 (SSL)
 *    - Username: Your full email address
 *    - Password: Your email account password
 *
 * 3. The 'from_email' must use a domain hosted on your Namecheap account
 *    Currently set to hello@humanityatheartintl.org (pipilot.dev is not allowed)
 *    To use pipilot.dev, you would need to:
 *    - Host pipilot.dev on the same Namecheap account
 *    - Or set up proper email forwarding/SPF records
 *    - Contact Namecheap support to allow cross-domain sending
 *
 * 4. Make sure this file is not accessible via web (should be above public_html)
 * 5. Set proper file permissions: chmod 600 email-config.php
 *
 * 6. If you get authentication errors, you may need to:
 *    - Enable SMTP authentication in your email account
 *    - Use an app-specific password if 2FA is enabled
 *    - Contact Namecheap support for SMTP settings
 */

?>
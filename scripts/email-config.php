<?php
/**
 * Email SMTP Configuration for PiPilot
 * This file contains SMTP settings for Zoho Mail
 */

// SMTP Configuration
$smtp_config = [
    'host' => 'smtp.zoho.com', // Zoho SMTP server
    'port' => 465, // 465 for SSL (Zoho recommends SSL)
    'username' => 'hello@pipilot.dev', // SMTP username (your Zoho email)
    'password' => 'Bamenda@5', // SET YOUR ZOHO SMTP PASSWORD HERE
    'encryption' => 'ssl', // 'ssl' for port 465
    'from_email' => 'hello@pipilot.dev', // Marketing email address
    'from_name' => 'PiPilot',
    'profile_icon' => 'https://pipilot.dev/pipilot-avatar.png' // Profile icon/avatar URL
];

/**
 * IMPORTANT ZOHO SMTP SETUP INSTRUCTIONS:
 *
 * 1. Password is already set to your Zoho password: Bamenda@5
 * 2. Zoho SMTP settings:
 *    - Host: smtp.zoho.com
 *    - Port: 465 (SSL) or 587 (TLS)
 *    - Username: hello@pipilot.dev
 *    - Password: Your Zoho account password
 *    - Encryption: SSL/TLS
 *
 * 3. Make sure your Zoho account has SMTP enabled:
 *    - Log into Zoho Mail web interface
 *    - Go to Settings > Mail Accounts > SMTP
 *    - Enable SMTP access if not already enabled
 *
 * 4. For marketing emails, consider:
 *    - Using a dedicated marketing email address
 *    - Setting up proper SPF/DKIM records for pipilot.dev
 *    - Including unsubscribe links in marketing emails
 *    - Following email marketing best practices
 *
 * 5. Security notes:
 *    - This file contains sensitive credentials
 *    - Make sure it's not accessible via web (should be above public_html)
 *    - Set proper file permissions: chmod 600 email-config.php
 *    - Consider using environment variables for production
 */

?>
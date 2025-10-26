<?php
/**
 * Email API for PiPilot
 * Handles sending emails using PHPMailer with SMTP authentication
 *
 * Usage: POST request with JSON data containing email details
 */

// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/email_error.log');

// Set headers for CORS and JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
    exit();
}

// Include PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require_once __DIR__ . '/vendor/autoload.php';

// Include SMTP configuration
require_once __DIR__ . '/email-config.php';

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate input
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON data'
    ]);
    exit();
}

// Required fields validation - different requirements based on email type
$type = isset($data['type']) ? $data['type'] : 'general';

$required_fields = ['to', 'subject'];

// For general emails and marketing, require message
if (in_array($type, ['general', 'marketing', 'test'])) {
    $required_fields[] = 'message';
}
// For specialized types, message is optional as they generate their own content
// invitation, welcome, notification, security, newsletter, feature, billing, support types will generate content automatically

foreach ($required_fields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Missing required field: {$field}"
        ]);
        exit();
    }
}

// Extract email data
$to = filter_var($data['to'], FILTER_VALIDATE_EMAIL);
$subject = trim($data['subject']);
$message = isset($data['message']) ? $data['message'] : '';
$from = isset($data['from']) ? filter_var($data['from'], FILTER_VALIDATE_EMAIL) : null;
$cc = isset($data['cc']) ? filter_var($data['cc'], FILTER_VALIDATE_EMAIL) : null;
$bcc = isset($data['bcc']) ? filter_var($data['bcc'], FILTER_VALIDATE_EMAIL) : null;
$type = isset($data['type']) ? $data['type'] : 'general';

// Validate email addresses
if (!$to) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid recipient email address'
    ]);
    exit();
}

if ($from && !$from) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid sender email address'
    ]);
    exit();
}

// Update from email if provided
$smtp_config['from_email'] = $from ?: $smtp_config['from_email'];

// Check if SMTP password is configured
if (empty($smtp_config['password'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SMTP configuration incomplete. Please set SMTP password in email-config.php.',
        'data' => [
            'to' => $to,
            'subject' => $subject,
            'type' => $type
        ]
    ]);
    exit();
}

$required_fields = ['to', 'subject'];

// For general emails and marketing, require message
if (in_array($type, ['general', 'marketing', 'test'])) {
    $required_fields[] = 'message';
}
// For specialized types, message is optional as they generate their own content
// invitation, welcome, notification, security, newsletter, feature, billing, support types will generate content automatically

foreach ($required_fields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Missing required field: {$field}"
        ]);
        exit();
    }
}

// Extract email data
$to = filter_var($data['to'], FILTER_VALIDATE_EMAIL);
$subject = trim($data['subject']);
$message = isset($data['message']) ? $data['message'] : '';
$from = isset($data['from']) ? filter_var($data['from'], FILTER_VALIDATE_EMAIL) : null;
$cc = isset($data['cc']) ? filter_var($data['cc'], FILTER_VALIDATE_EMAIL) : null;
$bcc = isset($data['bcc']) ? filter_var($data['bcc'], FILTER_VALIDATE_EMAIL) : null;
$type = isset($data['type']) ? $data['type'] : 'general';

// Validate email addresses
if (!$to) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid recipient email address'
    ]);
    exit();
}

if ($from && !$from) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid sender email address'
    ]);
    exit();
}

// Include SMTP configuration
require_once __DIR__ . '/email-config.php';

// Update from email if provided
$smtp_config['from_email'] = $from ?: $smtp_config['from_email'];

// Check if SMTP password is configured
if (empty($smtp_config['password'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SMTP configuration incomplete. Please set SMTP password in email-config.php.',
        'data' => [
            'to' => $to,
            'subject' => $subject,
            'type' => $type
        ]
    ]);
    exit();
}

// Prepare email content based on type
switch ($type) {
    case 'invitation':
        $email_content = prepare_invitation_email($data);
        break;
    case 'welcome':
        $email_content = prepare_welcome_email($data);
        break;
    case 'notification':
        $email_content = prepare_notification_email($data);
        break;
    case 'marketing':
        $email_content = prepare_marketing_email($data);
        break;
    case 'security':
        $email_content = prepare_security_email($data);
        break;
    case 'newsletter':
        $email_content = prepare_newsletter_email($data);
        break;
    case 'feature':
        $email_content = prepare_feature_email($data);
        break;
    case 'billing':
        $email_content = prepare_billing_email($data);
        break;
    case 'support':
        $email_content = prepare_support_email($data);
        break;
    default:
        $email_content = $message;
}

// Send email using PHPMailer
try {
    $mail = new PHPMailer(true);

    // SMTP Debug output
    $smtp_debug = '';
    $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->Debugoutput = function($str, $level) use (&$smtp_debug) {
        error_log($str);
        $smtp_debug .= $str . "\n";
    };

    // Server settings
    $mail->isSMTP();
    $mail->Host = $smtp_config['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtp_config['username'];
    $mail->Password = $smtp_config['password'];

    // Set encryption based on config
    if ($smtp_config['encryption'] === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;
    } else {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $smtp_config['port'];
    }

    // Additional SMTP options for Namecheap
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    // Set sender
    $mail->setFrom($smtp_config['from_email'], $smtp_config['from_name']);

    // Add recipient
    $mail->addAddress($to);

    // Add CC if provided
    if ($cc) {
        $mail->addCC($cc);
    }

    // Add BCC if provided
    if ($bcc) {
        $mail->addBCC($bcc);
    }

    // Set email format to HTML
    $mail->isHTML(true);

    // Set subject and body
    $mail->Subject = $subject;
    $mail->Body = $email_content;

    // Send email
    $mail_sent = $mail->send();

} catch (Exception $e) {
    error_log('PHPMailer Error: ' . $mail->ErrorInfo . "\nSMTP Debug: " . $smtp_debug);
    $mail_sent = false;
}

// Log the attempt (you might want to log to a file or database)
$log_data = [
    'timestamp' => date('Y-m-d H:i:s'),
    'to' => $to,
    'subject' => $subject,
    'type' => $type,
    'success' => $mail_sent,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'error' => $mail_sent ? null : ($mail->ErrorInfo ?? 'Unknown error')
];

// Simple file logging (create logs directory and make it writable)
$log_file = __DIR__ . '/logs/email_log.txt';
$log_dir = dirname($log_file);
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0755, true);
}
file_put_contents($log_file, json_encode($log_data) . PHP_EOL, FILE_APPEND);

// Return response
if ($mail_sent) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email sent successfully',
        'data' => [
            'to' => $to,
            'subject' => $subject,
            'type' => $type,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to send email: ' . ($mail->ErrorInfo ?? 'Unknown error'),
        'data' => [
            'to' => $to,
            'subject' => $subject,
            'type' => $type
        ]
    ]);
}

/**
 * Prepare invitation email content
 */
function prepare_invitation_email($data) {
    $invitee_name = $data['invitee_name'] ?? 'there';
    $organization_name = $data['organization_name'] ?? 'the team';
    $inviter_name = $data['inviter_name'] ?? 'someone';
    $accept_url = $data['accept_url'] ?? '#';
    $role = $data['role'] ?? 'member';
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Team Invitation - PiPilot</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 4s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid rgba(255, 255, 255, 0.9);
                margin: 0 auto 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .greeting {
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .highlight-box {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 1px solid #0ea5e9;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            .highlight-box h3 {
                color: #0c4a6e;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .highlight-box p {
                color: #0369a1;
                font-weight: 500;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #6366f1;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #6366f1;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .content { padding: 30px 25px; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>🚀</div>") . "
                <h1>You're Invited!</h1>
                <p>Join the PiPilot Team</p>
            </div>
            <div class='content'>
                <div class='greeting'>Hello {$invitee_name}!</div>
                <div class='message'>
                    <p>You've been personally invited to join <strong>{$organization_name}</strong> as a <strong>{$role}</strong>.</p>
                    <p><strong>{$inviter_name}</strong> believes you'd be a great addition to the team and wants you to be part of our innovative community.</p>
                </div>

                <div class='highlight-box'>
                    <h3>🎯 What You'll Get</h3>
                    <p>Access to cutting-edge AI tools, collaborative workspaces, and a community of forward-thinking developers.</p>
                </div>

                <div style='text-align: center;'>
                    <a href='{$accept_url}' class='cta-button'>Accept Invitation →</a>
                </div>

                <div class='message'>
                    <p>This invitation is exclusive to you and will expire in <strong>7 days</strong>. Don't miss this opportunity to join the future of software development!</p>
                    <p>Questions? Feel free to reply to this email or contact our support team.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>�</a>
                    </div>
                    <div class='disclaimer'>
                        This invitation was sent to you personally. If you weren't expecting this, you can safely ignore this email.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare welcome email content
 */
function prepare_welcome_email($data) {
    $user_name = $data['user_name'] ?? 'there';
    $organization_name = $data['organization_name'] ?? 'PiPilot';
    $login_url = $data['login_url'] ?? '#';
    $getting_started_url = $data['getting_started_url'] ?? '#';
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Welcome to PiPilot</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 4s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid rgba(255, 255, 255, 0.9);
                margin: 0 auto 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: float 6s ease-in-out infinite;
            }
            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-10px) rotate(1deg); }
                66% { transform: translateY(5px) rotate(-1deg); }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .greeting {
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .feature-card {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 25px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                border-color: #10b981;
            }
            .feature-icon {
                font-size: 32px;
                margin-bottom: 15px;
                display: block;
            }
            .feature-card h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .feature-card p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.5;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
            }
            .secondary-button {
                display: inline-block;
                background: transparent;
                color: #10b981;
                padding: 14px 35px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 15px 0;
                border: 2px solid #10b981;
                transition: all 0.3s ease;
            }
            .secondary-button:hover {
                background: #10b981;
                color: white;
                transform: translateY(-2px);
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #10b981;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #10b981;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .content { padding: 30px 25px; }
                .features-grid { grid-template-columns: 1fr; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>🎉</div>") . "
                <h1>Welcome Aboard!</h1>
                <p>Your journey with PiPilot begins now</p>
            </div>
            <div class='content'>
                <div class='greeting'>Hello {$user_name}!</div>
                <div class='message'>
                    <p>Welcome to <strong>{$organization_name}</strong>! We're thrilled to have you join our community of innovative developers and creators.</p>
                    <p>Your account has been successfully created and you're now ready to explore everything PiPilot has to offer.</p>
                </div>

                <div class='features-grid'>
                    <div class='feature-card'>
                        <span class='feature-icon'>🤖</span>
                        <h3>AI-Powered Tools</h3>
                        <p>Access cutting-edge AI tools to accelerate your development workflow.</p>
                    </div>
                    <div class='feature-card'>
                        <span class='feature-icon'>👥</span>
                        <h3>Team Collaboration</h3>
                        <p>Work seamlessly with your team in real-time collaborative environments.</p>
                    </div>
                    <div class='feature-card'>
                        <span class='feature-icon'>📊</span>
                        <h3>Analytics & Insights</h3>
                        <p>Track your progress and gain valuable insights into your development patterns.</p>
                    </div>
                </div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$login_url}' class='cta-button'>Get Started Now →</a>
                </div>

                <div style='text-align: center; margin: 20px 0;'>
                    <a href='{$getting_started_url}' class='secondary-button'>View Getting Started Guide</a>
                </div>

                <div class='message'>
                    <p>Need help getting started? Our comprehensive documentation and support team are here to help you every step of the way.</p>
                    <p>Happy coding! 🚀</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        You're receiving this email because you recently created an account with PiPilot.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare notification email content
 */
function prepare_notification_email($data) {
    $title = $data['title'] ?? 'Notification';
    $content = $data['content'] ?? $data['message'] ?? 'You have a new notification.';
    $action_url = $data['action_url'] ?? null;
    $action_text = $data['action_text'] ?? 'View Details';
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: notify 4s ease-in-out infinite;
            }
            @keyframes notify {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                50% { transform: scale(1.05) rotate(2deg); opacity: 0.8; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid rgba(255, 255, 255, 0.9);
                margin: 0 auto 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .notification-box {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 2px solid #3b82f6;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
            }
            .notification-box::before {
                content: '🔔';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid #3b82f6;
            }
            .notification-title {
                color: #1e40af;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 10px;
            }
            .notification-content {
                color: #1e40af;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(59, 130, 246, 0.4);
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: center;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #3b82f6;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #3b82f6;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .notification-box { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>🔔</div>") . "
                <h1>Notification</h1>
                <p>You have an important update</p>
            </div>
            <div class='content'>
                <div class='notification-box'>
                    <div class='notification-title'>{$title}</div>
                    <div class='notification-content'>{$content}</div>
                </div>

                " . ($action_url ? "
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$action_url}' class='cta-button'>{$action_text} →</a>
                </div>
                " : "") . "

                <div class='message'>
                    <p>This notification was sent to keep you informed about important updates and activities in your PiPilot account.</p>
                    <p>If you have any questions, our support team is here to help.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        You're receiving this notification because you're a valued member of the PiPilot community.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare marketing email content
 */
function prepare_marketing_email($data) {
    $title = $data['title'] ?? 'Special Offer';
    $content = $data['content'] ?? $data['message'] ?? 'Check out our latest updates and features!';
    $cta_text = $data['cta_text'] ?? 'Learn More';
    $cta_url = $data['cta_url'] ?? '#';
    $unsubscribe_url = $data['unsubscribe_url'] ?? '#';
    $hero_image = $data['hero_image'] ?? null;
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: sparkle 5s ease-in-out infinite;
            }
            @keyframes sparkle {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                25% { transform: scale(1.1) rotate(90deg); opacity: 0.8; }
                50% { transform: scale(0.9) rotate(180deg); opacity: 0.6; }
                75% { transform: scale(1.05) rotate(270deg); opacity: 0.7; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid rgba(255, 255, 255, 0.9);
                margin: 0 auto 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .hero-image {
                width: 100%;
                height: 200px;
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: #9ca3af;
                margin-bottom: 30px;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .marketing-content {
                background: linear-gradient(135deg, #fef7ff 0%, #fdf4ff 100%);
                border: 2px solid #ec4899;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
            }
            .marketing-content::before {
                content: '✨';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid #ec4899;
            }
            .marketing-title {
                color: #be185d;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 10px;
            }
            .marketing-text {
                color: #be185d;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
                color: white;
                padding: 18px 45px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 8px 25px rgba(236, 72, 153, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(236, 72, 153, 0.4);
            }
            .features-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .feature-item {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .feature-item:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                border-color: #ec4899;
            }
            .feature-icon {
                font-size: 32px;
                margin-bottom: 10px;
                display: block;
            }
            .feature-item h4 {
                color: #1a1a1a;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .feature-item p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.5;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #ec4899;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #ec4899;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .unsubscribe {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            .unsubscribe a {
                color: #ec4899;
                text-decoration: none;
            }
            .unsubscribe a:hover {
                text-decoration: underline;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .marketing-content { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .features-list { grid-template-columns: 1fr; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>🚀</div>") . "
                <h1>{$title}</h1>
                <p>Discover what's new at PiPilot</p>
            </div>

            " . ($hero_image ? "<div class='hero-image' style='background-image: url({$hero_image}); background-size: cover; background-position: center;'></div>" : "<div class='hero-image'>🎨</div>") . "

            <div class='content'>
                <div class='marketing-content'>
                    <div class='marketing-title'>{$title}</div>
                    <div class='marketing-text'>{$content}</div>
                </div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$cta_url}' class='cta-button'>{$cta_text} →</a>
                </div>

                <div class='features-list'>
                    <div class='feature-item'>
                        <span class='feature-icon'>🤖</span>
                        <h4>AI-Powered</h4>
                        <p>Advanced AI tools to supercharge your development workflow.</p>
                    </div>
                    <div class='feature-item'>
                        <span class='feature-icon'>⚡</span>
                        <h4>Lightning Fast</h4>
                        <p>Optimized performance for maximum productivity and speed.</p>
                    </div>
                    <div class='feature-item'>
                        <span class='feature-icon'>🔒</span>
                        <h4>Secure</h4>
                        <p>Enterprise-grade security to protect your data and projects.</p>
                    </div>
                </div>

                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$cta_url}' class='cta-button'>Get Started Today →</a>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='unsubscribe'>
                        <a href='{$unsubscribe_url}'>Unsubscribe</a> from marketing emails | <a href='#'>Update Preferences</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare security email content
 */
function prepare_security_email($data) {
    $title = $data['title'] ?? 'Security Alert';
    $content = $data['content'] ?? $data['message'] ?? 'We detected unusual activity on your account.';
    $action_url = $data['action_url'] ?? '#';
    $action_text = $data['action_text'] ?? 'Review Account Security';
    $ip_address = $data['ip_address'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot Security</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
                border: 3px solid #dc2626;
            }
            .header {
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: alert 2s ease-in-out infinite;
            }
            @keyframes alert {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid rgba(255, 255, 255, 0.9);
                margin: 0 auto 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: alert 3s ease-in-out infinite;
            }
            @keyframes alert {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .security-alert {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 3px solid #dc2626;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
                box-shadow: 0 8px 25px rgba(220, 38, 38, 0.2);
            }
            .security-alert::before {
                content: '🚨';
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                border: 4px solid #dc2626;
            }
            .alert-title {
                color: #991b1b;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 15px;
            }
            .alert-content {
                color: #991b1b;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .security-details {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                font-size: 14px;
                color: #64748b;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e2e8f0;
            }
            .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .detail-label {
                font-weight: 600;
                color: #374151;
            }
            .detail-value {
                color: #6b7280;
                font-family: 'Monaco', 'Menlo', monospace;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(220, 38, 38, 0.4);
            }
            .warning-message {
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
            }
            .warning-message h4 {
                color: #92400e;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .warning-message p {
                color: #92400e;
                font-size: 14px;
                line-height: 1.6;
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: center;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #dc2626;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #dc2626;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .security-alert { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .security-details { padding: 15px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>🔒</div>") . "
                <h1>Security Alert</h1>
                <p>Important account notification</p>
            </div>
            <div class='content'>
                <div class='security-alert'>
                    <div class='alert-title'>{$title}</div>
                    <div class='alert-content'>{$content}</div>
                </div>

                <div class='security-details'>
                    <div class='detail-row'>
                        <span class='detail-label'>Time:</span>
                        <span class='detail-value'>{$timestamp}</span>
                    </div>
                    <div class='detail-row'>
                        <span class='detail-label'>IP Address:</span>
                        <span class='detail-value'>{$ip_address}</span>
                    </div>
                    <div class='detail-row'>
                        <span class='detail-label'>Location:</span>
                        <span class='detail-value'>Detected automatically</span>
                    </div>
                </div>

                <div class='warning-message'>
                    <h4>⚠️ Action Required</h4>
                    <p>If you didn't initiate this action, please secure your account immediately by changing your password and reviewing your security settings.</p>
                </div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$action_url}' class='cta-button'>{$action_text} →</a>
                </div>

                <div class='message'>
                    <p>Your account security is our top priority. This automated notification helps keep your PiPilot account safe.</p>
                    <p>If you have any questions about this security alert, please contact our support team immediately.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        This is an automated security notification. For urgent security concerns, contact our security team at security@pixelpilot.dev
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare newsletter email content
 */
function prepare_newsletter_email($data) {
    $title = $data['title'] ?? 'Newsletter';
    $content = $data['content'] ?? $data['message'] ?? 'Stay updated with the latest from PiPilot!';
    $unsubscribe_url = $data['unsubscribe_url'] ?? '#';
    $sections = $data['sections'] ?? [];
    $profile_icon = $data['profile_icon'] ?? $GLOBALS['smtp_config']['profile_icon'] ?? '';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot Newsletter</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: newsletter 4s ease-in-out infinite;
            }
            @keyframes newsletter {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                25% { transform: scale(1.1) rotate(1deg); opacity: 0.8; }
                50% { transform: scale(0.95) rotate(-1deg); opacity: 0.6; }
                75% { transform: scale(1.05) rotate(0.5deg); opacity: 0.7; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .newsletter-intro {
                background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
                border: 2px solid #7c3aed;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
            }
            .newsletter-intro::before {
                content: '📧';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid #7c3aed;
            }
            .intro-title {
                color: #581c87;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 10px;
            }
            .intro-content {
                color: #581c87;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .sections {
                margin: 40px 0;
            }
            .section {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 20px;
                transition: all 0.3s ease;
            }
            .section:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                border-color: #7c3aed;
            }
            .section h3 {
                color: #1a1a1a;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .section-icon {
                font-size: 24px;
            }
            .section p {
                color: #64748b;
                font-size: 15px;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .section-link {
                color: #7c3aed;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: all 0.3s ease;
            }
            .section-link:hover {
                color: #581c87;
                text-decoration: underline;
            }
            .cta-section {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                border-radius: 16px;
                padding: 40px;
                text-align: center;
                margin: 40px 0;
                color: white;
            }
            .cta-section h3 {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .cta-section p {
                font-size: 16px;
                margin-bottom: 25px;
                opacity: 0.9;
            }
            .cta-button {
                display: inline-block;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(10px);
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
                background: rgba(255, 255, 255, 0.3);
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #7c3aed;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #7c3aed;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .unsubscribe {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            .unsubscribe a {
                color: #7c3aed;
                text-decoration: none;
            }
            .unsubscribe a:hover {
                text-decoration: underline;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .newsletter-intro { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .sections { margin: 30px 0; }
                .section { padding: 20px; }
                .cta-section { padding: 30px 20px; margin: 30px 0; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                " . (!empty($profile_icon) ? "<div class='profile-avatar'><img src='{$profile_icon}' alt='PiPilot' /></div>" : "<div class='profile-avatar'>📧</div>") . "
                <h1>{$title}</h1>
                <p>Your weekly dose of PiPilot updates</p>
            </div>
            <div class='content'>
                <div class='newsletter-intro'>
                    <div class='intro-title'>{$title}</div>
                    <div class='intro-content'>{$content}</div>
                </div>

                <div class='sections'>
                    <div class='section'>
                        <h3><span class='section-icon'>🚀</span> What's New</h3>
                        <p>Discover the latest features and improvements we've added to make your development experience even better.</p>
                        <a href='#' class='section-link'>Read more →</a>
                    </div>

                    <div class='section'>
                        <h3><span class='section-icon'>💡</span> Tips & Tricks</h3>
                        <p>Get expert advice on maximizing your productivity with PiPilot's AI-powered tools.</p>
                        <a href='#' class='section-link'>View tips →</a>
                    </div>

                    <div class='section'>
                        <h3><span class='section-icon'>👥</span> Community Spotlight</h3>
                        <p>Meet the developers who are building amazing things with PiPilot.</p>
                        <a href='#' class='section-link'>See stories →</a>
                    </div>

                    <div class='section'>
                        <h3><span class='section-icon'>📈</span> Upcoming Features</h3>
                        <p>Get a sneak peek at what's coming next to PiPilot.</p>
                        <a href='#' class='section-link'>Learn more →</a>
                    </div>
                </div>

                <div class='cta-section'>
                    <h3>Ready to Build Something Amazing?</h3>
                    <p>Join thousands of developers who trust PiPilot for their development needs.</p>
                    <a href='#' class='cta-button'>Get Started Today →</a>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='unsubscribe'>
                        <a href='{$unsubscribe_url}'>Unsubscribe</a> from this newsletter | <a href='#'>Update Preferences</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare feature announcement email content
 */
function prepare_feature_email($data) {
    $title = $data['title'] ?? 'New Feature Alert';
    $feature_name = $data['feature_name'] ?? 'New Feature';
    $content = $data['content'] ?? $data['message'] ?? 'We\'ve added an exciting new feature to enhance your experience!';
    $try_url = $data['try_url'] ?? '#';
    $learn_more_url = $data['learn_more_url'] ?? '#';
    $feature_icon = $data['feature_icon'] ?? '✨';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: feature 5s ease-in-out infinite;
            }
            @keyframes feature {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                33% { transform: scale(1.1) rotate(120deg); opacity: 0.8; }
                66% { transform: scale(0.9) rotate(240deg); opacity: 0.6; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .feature-highlight {
                background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
                border: 3px solid #06b6d4;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
                box-shadow: 0 8px 25px rgba(6, 182, 212, 0.2);
            }
            .feature-highlight::before {
                content: '{$feature_icon}';
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                border: 4px solid #06b6d4;
            }
            .feature-title {
                color: #0c4a6e;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 15px;
            }
            .feature-subtitle {
                color: #0891b2;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .feature-content {
                color: #0c4a6e;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .feature-benefits {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 25px 0;
            }
            .benefit-item {
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid #e0f2fe;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }
            .benefit-item h4 {
                color: #0c4a6e;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .benefit-item p {
                color: #0891b2;
                font-size: 12px;
                line-height: 1.4;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                color: white;
                padding: 18px 45px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px;
                box-shadow: 0 8px 25px rgba(6, 182, 212, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(6, 182, 212, 0.4);
            }
            .secondary-button {
                display: inline-block;
                background: transparent;
                color: #06b6d4;
                padding: 14px 35px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 10px;
                border: 2px solid #06b6d4;
                transition: all 0.3s ease;
            }
            .secondary-button:hover {
                background: #06b6d4;
                color: white;
                transform: translateY(-2px);
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: center;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #06b6d4;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #06b6d4;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .feature-highlight { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .feature-benefits { grid-template-columns: 1fr; }
                .cta-button, .secondary-button { display: block; width: 100%; max-width: 300px; margin: 10px auto; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <div class='logo'>🚀</div>
                <h1>New Feature Available!</h1>
                <p>Discover what's new in PiPilot</p>
            </div>
            <div class='content'>
                <div class='feature-highlight'>
                    <div class='feature-title'>{$feature_name}</div>
                    <div class='feature-subtitle'>{$title}</div>
                    <div class='feature-content'>{$content}</div>

                    <div class='feature-benefits'>
                        <div class='benefit-item'>
                            <h4>⚡ Faster</h4>
                            <p>Improved performance and speed</p>
                        </div>
                        <div class='benefit-item'>
                            <h4>🎯 Smarter</h4>
                            <p>Enhanced AI capabilities</p>
                        </div>
                        <div class='benefit-item'>
                            <h4>💫 Better</h4>
                            <p>Upgraded user experience</p>
                        </div>
                    </div>
                </div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$try_url}' class='cta-button'>Try {$feature_name} Now →</a>
                </div>

                <div style='text-align: center; margin: 20px 0;'>
                    <a href='{$learn_more_url}' class='secondary-button'>Learn More About This Feature</a>
                </div>

                <div class='message'>
                    <p>This feature is now available in your PiPilot account. Start exploring and see how it can enhance your development workflow!</p>
                    <p>Questions about this new feature? Our support team is here to help.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        You're receiving this email because you're a valued PiPilot user. We occasionally send updates about new features and improvements.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare billing email content
 */
function prepare_billing_email($data) {
    $title = $data['title'] ?? 'Billing Update';
    $content = $data['content'] ?? $data['message'] ?? 'Here are the details of your recent billing activity.';
    $amount = $data['amount'] ?? '';
    $action_url = $data['action_url'] ?? '#';
    $action_text = $data['action_text'] ?? 'View Billing Details';
    $invoice_id = $data['invoice_id'] ?? '';
    $due_date = $data['due_date'] ?? '';
    $status = $data['status'] ?? 'pending';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot Billing</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: billing 4s ease-in-out infinite;
            }
            @keyframes billing {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .billing-info {
                background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
                border: 3px solid #f59e0b;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
                box-shadow: 0 8px 25px rgba(245, 158, 11, 0.2);
            }
            .billing-info::before {
                content: '💳';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid #f59e0b;
            }
            .billing-title {
                color: #92400e;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 10px;
            }
            .billing-amount {
                font-size: 36px;
                font-weight: 700;
                color: #92400e;
                margin: 15px 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .billing-details {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                font-size: 14px;
                color: #64748b;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e2e8f0;
            }
            .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .detail-label {
                font-weight: 600;
                color: #374151;
            }
            .detail-value {
                color: #6b7280;
                font-family: 'Monaco', 'Menlo', monospace;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                margin-top: 10px;
            }
            .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
            .status-paid { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
            .status-overdue { background: #fee2e2; color: #991b1b; border: 1px solid #dc2626; }
            .billing-content {
                color: #64748b;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 30px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(245, 158, 11, 0.4);
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: center;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #f59e0b;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #f59e0b;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .billing-info { padding: 25px; margin: 20px 0; }
                .billing-amount { font-size: 32px; }
                .content { padding: 30px 25px; }
                .billing-details { padding: 15px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <div class='logo'>💳</div>
                <h1>Billing Update</h1>
                <p>Account billing information</p>
            </div>
            <div class='content'>
                <div class='billing-info'>
                    <div class='billing-title'>{$title}</div>
                    " . ($amount ? "<div class='billing-amount'>{$amount}</div>" : "") . "
                    <div class='status-badge status-{$status}'>{$status}</div>
                </div>

                <div class='billing-details'>
                    " . ($invoice_id ? "<div class='detail-row'><span class='detail-label'>Invoice ID:</span><span class='detail-value'>{$invoice_id}</span></div>" : "") . "
                    " . ($due_date ? "<div class='detail-row'><span class='detail-label'>Due Date:</span><span class='detail-value'>{$due_date}</span></div>" : "") . "
                    <div class='detail-row'><span class='detail-label'>Date:</span><span class='detail-value'>" . date('M j, Y') . "</span></div>
                    <div class='detail-row'><span class='detail-label'>Status:</span><span class='detail-value'>" . ucfirst($status) . "</span></div>
                </div>

                <div class='billing-content'>{$content}</div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$action_url}' class='cta-button'>{$action_text} →</a>
                </div>

                <div class='message'>
                    <p>Questions about your billing? Our support team is here to help you with any billing-related inquiries.</p>
                    <p>You can view your complete billing history and manage your subscription in your account settings.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        This is an automated billing notification. For billing support, contact billing@pixelpilot.dev
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Prepare support email content
 */
function prepare_support_email($data) {
    $title = $data['title'] ?? 'Support Request';
    $content = $data['content'] ?? $data['message'] ?? 'Thank you for contacting our support team. We\'ve received your request and will respond shortly.';
    $ticket_id = $data['ticket_id'] ?? '';
    $support_url = $data['support_url'] ?? '#';
    $action_text = $data['action_text'] ?? 'View Support Ticket';
    $priority = $data['priority'] ?? 'normal';
    $status = $data['status'] ?? 'open';

    $html = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title} - PiPilot Support</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            .header {
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: support 5s ease-in-out infinite;
            }
            @keyframes support {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                25% { transform: scale(1.1) rotate(90deg); opacity: 0.8; }
                50% { transform: scale(0.95) rotate(180deg); opacity: 0.6; }
                75% { transform: scale(1.05) rotate(270deg); opacity: 0.7; }
            }
            .logo {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }
            .header p {
                color: rgba(255, 255, 255, 0.9);
                font-size: 18px;
                font-weight: 400;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 50px 40px;
                background: #ffffff;
            }
            .support-info {
                background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
                border: 3px solid #0ea5e9;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
                box-shadow: 0 8px 25px rgba(14, 165, 233, 0.2);
            }
            .support-info::before {
                content: '🆘';
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid #0ea5e9;
            }
            .support-title {
                color: #0c4a6e;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                margin-top: 10px;
            }
            .support-content {
                color: #0c4a6e;
                font-size: 16px;
                line-height: 1.7;
                margin-bottom: 25px;
            }
            .support-details {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                font-size: 14px;
                color: #64748b;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e2e8f0;
            }
            .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .detail-label {
                font-weight: 600;
                color: #374151;
            }
            .detail-value {
                color: #6b7280;
                font-family: 'Monaco', 'Menlo', monospace;
            }
            .priority-badge, .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                margin-top: 10px;
            }
            .priority-low { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
            .priority-normal { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
            .priority-high { background: #fee2e2; color: #991b1b; border: 1px solid #dc2626; }
            .priority-urgent { background: #fee2e2; color: #991b1b; border: 1px solid #dc2626; animation: urgent 1s ease-in-out infinite; }
            .status-open { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
            .status-in-progress { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
            .status-resolved { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
            .status-closed { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
            @keyframes urgent {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            .message {
                font-size: 16px;
                color: #64748b;
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: center;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(14, 165, 233, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(14, 165, 233, 0.4);
            }
            .help-section {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #0ea5e9;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            .help-section h3 {
                color: #0c4a6e;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .help-section p {
                color: #0c4a6e;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .help-links {
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
            }
            .help-link {
                color: #0ea5e9;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                padding: 8px 16px;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                transition: all 0.3s ease;
            }
            .help-link:hover {
                background: #0ea5e9;
                color: white;
            }
            .footer {
                background: #f8fafc;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            .footer h3 {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .footer p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 8px;
                text-decoration: none;
                color: #64748b;
                font-size: 18px;
                line-height: 40px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .social-links a:hover {
                background: #0ea5e9;
                color: white;
                transform: translateY(-2px);
            }
            .brand {
                color: #0ea5e9;
                font-weight: 700;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .disclaimer {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
                line-height: 1.5;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; border-radius: 12px; }
                .header { padding: 40px 30px; }
                .header h1 { font-size: 28px; }
                .support-info { padding: 25px; margin: 20px 0; }
                .content { padding: 30px 25px; }
                .support-details { padding: 15px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
                .help-links { flex-direction: column; align-items: center; }
                .footer { padding: 30px 25px; }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <div class='logo'>🆘</div>
                <h1>Support Update</h1>
                <p>We're here to help you</p>
            </div>
            <div class='content'>
                <div class='support-info'>
                    <div class='support-title'>{$title}</div>
                    <div class='support-content'>{$content}</div>
                    <div class='priority-badge priority-{$priority}'>{$priority} priority</div>
                    <div class='status-badge status-{$status}'>{$status}</div>
                </div>

                <div class='support-details'>
                    " . ($ticket_id ? "<div class='detail-row'><span class='detail-label'>Ticket ID:</span><span class='detail-value'>{$ticket_id}</span></div>" : "") . "
                    <div class='detail-row'><span class='detail-label'>Priority:</span><span class='detail-value'>" . ucfirst($priority) . "</span></div>
                    <div class='detail-row'><span class='detail-label'>Status:</span><span class='detail-value'>" . ucfirst($status) . "</span></div>
                    <div class='detail-row'><span class='detail-label'>Last Updated:</span><span class='detail-value'>" . date('M j, Y H:i') . "</span></div>
                </div>

                <div style='text-align: center; margin: 40px 0;'>
                    <a href='{$support_url}' class='cta-button'>{$action_text} →</a>
                </div>

                <div class='help-section'>
                    <h3>Need More Help?</h3>
                    <p>While you wait for our response, here are some resources that might help:</p>
                    <div class='help-links'>
                        <a href='#' class='help-link'>📚 Documentation</a>
                        <a href='#' class='help-link'>💬 Community Forum</a>
                        <a href='#' class='help-link'>🎥 Video Tutorials</a>
                        <a href='#' class='help-link'>📞 Live Chat</a>
                    </div>
                </div>

                <div class='message'>
                    <p>Our support team typically responds within 24 hours. For urgent issues, please call our emergency hotline.</p>
                    <p>You can also check the status of your ticket anytime by logging into your account.</p>
                </div>
            </div>
            <div class='footer'>
                <div class='footer-content'>
                    <div class='brand'>PiPilot</div>
                    <p>Empowering developers with AI-driven tools for the future of software development.</p>
                    <div class='social-links'>
                        <a href='#'>𝕏</a>
                        <a href='#'>💼</a>
                        <a href='#'>📘</a>
                        <a href='#'>📧</a>
                    </div>
                    <div class='disclaimer'>
                        This is an automated support notification. For urgent matters, contact support@pixelpilot.dev or call our emergency line.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";

    return $html;
}

/**
 * Send email using SMTP
 */
function send_smtp_email($config, $to, $subject, $message, $cc = null, $bcc = null) {
    $host = $config['host'];
    $port = $config['port'];
    $username = $config['username'];
    $password = $config['password'];
    $encryption = $config['encryption'];
    $from_email = $config['from_email'];
    $from_name = $config['from_name'];

    // Create socket connection
    $socket = fsockopen(($encryption === 'ssl' ? 'ssl://' : 'tcp://') . $host, $port, $errno, $errstr, 30);

    if (!$socket) {
        error_log("SMTP Connection failed: $errstr ($errno)");
        return false;
    }

    // Set timeout
    stream_set_timeout($socket, 30);

    // Read server greeting
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 220)) {
        fclose($socket);
        return false;
    }

    // Send EHLO
    fputs($socket, "EHLO " . gethostname() . "\r\n");
    $response = '';
    while ($line = fgets($socket, 515)) {
        $response .= $line;
        if (substr($line, 3, 1) === ' ') break;
    }

    // Start TLS if required
    if ($encryption === 'tls') {
        fputs($socket, "STARTTLS\r\n");
        $response = fgets($socket, 515);
        if (!smtp_check_response($response, 220)) {
            fclose($socket);
            return false;
        }

        // Enable crypto
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            return false;
        }

        // Send EHLO again after TLS
        fputs($socket, "EHLO " . gethostname() . "\r\n");
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
    }

    // Authenticate
    fputs($socket, "AUTH LOGIN\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 334)) {
        fclose($socket);
        return false;
    }

    // Send username (base64 encoded)
    fputs($socket, base64_encode($username) . "\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 334)) {
        fclose($socket);
        return false;
    }

    // Send password (base64 encoded)
    fputs($socket, base64_encode($password) . "\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 235)) {
        fclose($socket);
        return false;
    }

    // Send MAIL FROM
    fputs($socket, "MAIL FROM:<$from_email>\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 250)) {
        fclose($socket);
        return false;
    }

    // Send RCPT TO
    fputs($socket, "RCPT TO:<$to>\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 250)) {
        fclose($socket);
        return false;
    }

    // Send CC if provided
    if ($cc) {
        fputs($socket, "RCPT TO:<$cc>\r\n");
        $response = fgets($socket, 515);
        // Continue even if CC fails
    }

    // Send BCC if provided
    if ($bcc) {
        fputs($socket, "RCPT TO:<$bcc>\r\n");
        $response = fgets($socket, 515);
        // Continue even if BCC fails
    }

    // Send DATA
    fputs($socket, "DATA\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 354)) {
        fclose($socket);
        return false;
    }

    // Build email headers
    $headers = "From: $from_name <$from_email>\r\n";
    $headers .= "To: $to\r\n";
    if ($cc) $headers .= "CC: $cc\r\n";
    $headers .= "Subject: $subject\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PiPilot SMTP API\r\n";
    $headers .= "\r\n";

    // Send headers and message
    fputs($socket, $headers . $message . "\r\n.\r\n");
    $response = fgets($socket, 515);
    if (!smtp_check_response($response, 250)) {
        fclose($socket);
        return false;
    }

    // Send QUIT
    fputs($socket, "QUIT\r\n");
    $response = fgets($socket, 515);

    fclose($socket);
    return true;
}

/**
 * Check SMTP response code
 */
function smtp_check_response($response, $expected_code) {
    $code = substr($response, 0, 3);
    return $code == $expected_code;
}

?>
/**
 * Email API client for PiPilot
 * Handles sending emails through the PHP email API
 */

interface EmailData {
  to: string;
  subject: string;
  message?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  type?: 'general' | 'invitation' | 'welcome' | 'notification';
  // Additional data for specific email types
  invitee_name?: string;
  organization_name?: string;
  inviter_name?: string;
  accept_url?: string;
  role?: string;
  user_name?: string;
  title?: string;
  content?: string;
}

interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Send email using the PHP email API
 */
export async function sendEmail(
  emailData: EmailData,
  apiUrl: string = process.env.NEXT_PUBLIC_EMAIL_API_URL || 'https://your-php-server.com/email-api.php'
): Promise<EmailResponse> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result: EmailResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitation(
  email: string,
  organizationName: string,
  inviterName: string,
  role: string,
  invitationToken: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'
): Promise<EmailResponse> {
  const acceptUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;

  return sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName}`,
    type: 'invitation',
    invitee_name: email.split('@')[0], // Use email prefix as name fallback
    organization_name: organizationName,
    inviter_name: inviterName,
    accept_url: acceptUrl,
    role: role,
  });
}

/**
 * Send welcome email to new team member
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  organizationName: string
): Promise<EmailResponse> {
  return sendEmail({
    to: email,
    subject: `Welcome to ${organizationName}!`,
    type: 'welcome',
    user_name: userName,
    organization_name: organizationName,
  });
}

/**
 * Send general notification email
 */
export async function sendNotificationEmail(
  email: string,
  title: string,
  content: string
): Promise<EmailResponse> {
  return sendEmail({
    to: email,
    subject: title,
    type: 'notification',
    title: title,
    content: content,
  });
}

/**
 * Test email functionality
 */
export async function testEmailConnection(
  testEmail: string,
  apiUrl?: string
): Promise<EmailResponse> {
  return sendEmail({
    to: testEmail,
    subject: 'PiPilot Email Test',
    message: '<h1>Email Test Successful!</h1><p>If you received this email, your email configuration is working correctly.</p>',
    type: 'notification',
  }, apiUrl);
}
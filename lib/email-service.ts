import nodemailer from 'nodemailer';

// Zoho SMTP Configuration
const SMTP_CONFIG = {
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'hello@pipilot.dev',
    pass: 'Bamenda@5'
  }
};

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport(SMTP_CONFIG);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    encoding?: string;
    contentType?: string;
  }>;
}

/**
 * Send an email using Zoho SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Prepare email options
    const mailOptions = {
      from: {
        name: 'PiPilot',
        address: options.from || 'hello@pipilot.dev'
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error: any) {
    console.error('Email sending error:', {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send a marketing email with proper formatting
 */
export async function sendMarketingEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const htmlContent = options.unsubscribeUrl
    ? `${options.html}<br><br><hr><p style="font-size: 12px; color: #666;">If you no longer wish to receive these emails, you can <a href="${options.unsubscribeUrl}">unsubscribe here</a>.</p>`
    : options.html;

  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: htmlContent,
    text: options.text,
    from: 'hello@pipilot.dev'
  });
}

/**
 * Send a transactional email (password reset, notifications, etc.)
 */
export async function sendTransactionalEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    from: 'hello@pipilot.dev'
  });
}

/**
 * Test email functionality
 */
export async function testEmailConnection(testEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await transporter.verify();
    console.log('SMTP connection successful');

    // Send a test email
    const result = await sendEmail({
      to: testEmail,
      subject: 'PiPilot Email Test',
      html: `
        <h2>🎉 Email Test Successful!</h2>
        <p>Your PiPilot email configuration is working correctly.</p>
        <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>SMTP Server:</strong> smtp.zoho.com (Port 465)</p>
      `,
      text: `Email test successful! Sent at ${new Date().toLocaleString()}`
    });

    return result;
  } catch (error: any) {
    console.error('Email test failed:', error);
    return {
      success: false,
      error: error.message || 'Email test failed'
    };
  }
}
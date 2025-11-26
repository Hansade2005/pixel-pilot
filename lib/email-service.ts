import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

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

/**
 * HTML Email Wrapper - Wraps AI-generated content in professional templates
 */
export interface EmailWrapperOptions {
  subject: string;
  aiContent: string; // The AI-generated HTML content
  greeting?: string;
  subtitle?: string;
  heroTitle?: string;
  heroContent?: string;
  featuresTitle?: string;
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  ctaText?: string;
  ctaUrl?: string;
  ctaSubtext?: string;
  additionalTitle?: string;
  additionalContent?: string;
  userEmail?: string;
  unsubscribeUrl?: string;
}

export async function wrapEmailContent(options: EmailWrapperOptions): Promise<string> {
  try {
    // Read the professional template
    const templatePath = join(process.cwd(), 'templates', 'professional-email-template.html');
    let template = readFileSync(templatePath, 'utf-8');

    // Set defaults
    const defaults = {
      EMAIL_SUBJECT: options.subject,
      LOGO_URL: 'https://pipilot.dev/logo.png', // Update with actual logo URL
      GREETING: options.greeting || 'Hello!',
      SUBTITLE: options.subtitle || 'We have something special for you',
      HERO_TITLE: options.heroTitle || 'Discover the Power of AI',
      HERO_CONTENT: options.heroContent || 'Experience the future of app development with our AI-powered platform.',
      MAIN_CONTENT: options.aiContent,
      FEATURES_TITLE: options.featuresTitle || 'Key Features',
      FEATURE_1_TITLE: options.features?.[0]?.title || 'AI-Powered Development',
      FEATURE_1_DESCRIPTION: options.features?.[0]?.description || 'Build apps faster with intelligent code generation.',
      FEATURE_2_TITLE: options.features?.[1]?.title || 'No-Code Interface',
      FEATURE_2_DESCRIPTION: options.features?.[1]?.description || 'Create professional apps without writing code.',
      FEATURE_3_TITLE: options.features?.[2]?.title || 'Cloud Deployment',
      FEATURE_3_DESCRIPTION: options.features?.[2]?.description || 'Deploy your apps instantly to the cloud.',
      CTA_TEXT: options.ctaText || 'Get Started Today',
      CTA_URL: options.ctaUrl || 'https://pipilot.dev',
      CTA_SUBTEXT: options.ctaSubtext || 'Join thousands of developers building the future.',
      ADDITIONAL_TITLE: options.additionalTitle || 'Why Choose PiPilot?',
      ADDITIONAL_CONTENT: options.additionalContent || 'PiPilot combines the power of AI with intuitive design to make app development accessible to everyone.',
      WEBSITE_URL: 'https://pipilot.dev',
      BLOG_URL: 'https://pipilot.dev/blog',
      SUPPORT_URL: 'https://pipilot.dev/support',
      UNSUBSCRIBE_URL: options.unsubscribeUrl || 'https://pipilot.dev/unsubscribe',
      CURRENT_YEAR: new Date().getFullYear().toString(),
      USER_EMAIL: options.userEmail || 'user@example.com'
    };

    // Replace placeholders
    Object.entries(defaults).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    });

    return template;
  } catch (error: any) {
    console.error('Error wrapping email content:', error);
    // Fallback to simple HTML if template fails
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${options.subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>PiPilot</h1>
          <h2>${options.greeting || 'Hello!'}</h2>
          ${options.aiContent}
          <div style="margin-top: 30px; text-align: center;">
            <a href="${options.ctaUrl || 'https://pipilot.dev'}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">${options.ctaText || 'Get Started'}</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
/**
 * Client-side email service that uses the API endpoint
 * This file is safe to import in browser components
 */

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
    content: string;
    encoding?: string;
  }>;
}

/**
 * Send an email using the server-side API
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send email'
      };
    }

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error: any) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send a transactional email (client-side wrapper)
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
 * Send a marketing email with proper formatting (client-side wrapper)
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
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Primary: Zeptomail SMTP Configuration (Zoho's transactional email service)
const PRIMARY_SMTP_CONFIG = {
  host: 'smtp.zeptomail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'emailapikey',
    pass: 'wSsVR60krkLzB6Yrzzz8dbhryw4HUVulHBgo0VfyvyP8SKqU8cc8khDJAgfxSKMdFzY7FmFAobkgnx8F2mEHhtskw11TWSiF9mqRe1U4J3x17qnvhDzDWW9UlhKIKogLwAxpk2FpEMol+g=='
  }
};

// Fallback: Zoho Mail SMTP Configuration
const FALLBACK_SMTP_CONFIG = {
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: 'hello@pipilot.dev',
    pass: 'Bamenda@5'
  }
};

// Create reusable transporters
const primaryTransporter = nodemailer.createTransport(PRIMARY_SMTP_CONFIG);
const fallbackTransporter = nodemailer.createTransport(FALLBACK_SMTP_CONFIG);

interface EmailRequest {
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

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();

    // Validate required fields
    if (!body.to || !body.subject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: to and subject are required'
        },
        { status: 400 }
      );
    }

    // Validate that we have content (html or text)
    if (!body.html && !body.text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing content: either html or text must be provided'
        },
        { status: 400 }
      );
    }

    // Prepare email options
    const mailOptions = {
      from: body.from || '"PiPilot" <hello@pipilot.dev>',
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      cc: body.cc,
      bcc: body.bcc,
      replyTo: body.replyTo,
      attachments: body.attachments
    };

    // Try primary (Zeptomail) first, fall back to Zoho SMTP on failure
    let info;
    let usedFallback = false;

    try {
      info = await primaryTransporter.sendMail(mailOptions);
    } catch (primaryError: any) {
      console.warn('Primary SMTP (Zeptomail) failed, trying fallback (Zoho):', {
        error: primaryError.message,
        code: primaryError.code,
        timestamp: new Date().toISOString()
      });

      // Retry with fallback transporter
      info = await fallbackTransporter.sendMail(mailOptions);
      usedFallback = true;
    }

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: body.to,
      subject: body.subject,
      provider: usedFallback ? 'zoho-fallback' : 'zeptomail-primary',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      envelope: info.envelope,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      provider: usedFallback ? 'fallback' : 'primary'
    });

  } catch (error: any) {
    console.error('Email sending error (both providers failed):', {
      error: error.message,
      code: error.code,
      command: error.command,
      timestamp: new Date().toISOString()
    });

    // Handle specific SMTP errors
    let errorMessage = 'Failed to send email';
    let statusCode = 500;

    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check SMTP credentials.';
      statusCode = 401;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check SMTP server settings.';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Please try again later.';
      statusCode = 504;
    } else if (error.message?.includes('Invalid recipient')) {
      errorMessage = 'Invalid recipient email address.';
      statusCode = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
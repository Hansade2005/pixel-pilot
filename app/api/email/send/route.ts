import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Zeptomail SMTP Configuration (Zoho's transactional email service)
const SMTP_CONFIG = {
  host: 'smtp.zeptomail.com',
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: 'emailapikey',
    pass: 'wSsVR60krkLzB6Yrzzz8dbhryw4HUVulHBgo0VfyvyP8SKqU8cc8khDJAgfxSKMdFzY7FmFAobkgnx8F2mEHhtskw11TWSiF9mqRe1U4J3x17qnvhDzDWW9UlhKIKogLwAxpk2FpEMol+g=='
  }
};

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport(SMTP_CONFIG);

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

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: body.to,
      subject: body.subject,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      envelope: info.envelope,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    });

  } catch (error: any) {
    console.error('Email sending error:', {
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
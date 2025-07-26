/**
 * Test email service endpoint
 */
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email';
import { testEmailService, sendVerificationEmail } from '@/lib/utils/email';
import { env } from '@/lib/config/env';

export async function GET(request: NextRequest) {
  try {
    // Test email service connection
    const isConnected = await testEmailService();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Email service is not properly configured or connection failed',
          code: 'EMAIL_SERVICE_UNAVAILABLE'
        }
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Email service is properly configured and connected',
        config: {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          from: env.SMTP_FROM,
          hasCredentials: !!(env.SMTP_USER && env.SMTP_PASS)
        }
      }
    });
  } catch (error) {
    console.error('Email service test error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: 'Failed to test email service',
        code: 'EMAIL_TEST_FAILED'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, ...data } = body;

    if (!to) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Recipient email address is required',
          code: 'MISSING_RECIPIENT'
        }
      }, { status: 400 });
    }

    let result = false;

    switch (type) {
      case 'verification':
        if (!data.userName || !data.token) {
          return NextResponse.json({
            success: false,
            error: {
              message: 'userName and token are required for verification email',
              code: 'MISSING_PARAMETERS'
            }
          }, { status: 400 });
        }
        result = await sendVerificationEmail(to, data.userName, data.token);
        break;

      case 'test':
        result = await emailService.sendEmail({
          to,
          subject: 'Test Email from LastMile Delivery',
          html: `
            <h2>Test Email</h2>
            <p>This is a test email from the LastMile Delivery platform.</p>
            <p>If you received this email, the email service is working correctly.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
          `,
          text: `
            Test Email
            
            This is a test email from the LastMile Delivery platform.
            If you received this email, the email service is working correctly.
            
            Sent at: ${new Date().toLocaleString()}
          `
        });
        break;

      case 'custom':
        if (!data.subject || !data.message) {
          return NextResponse.json({
            success: false,
            error: {
              message: 'subject and message are required for custom email',
              code: 'MISSING_PARAMETERS'
            }
          }, { status: 400 });
        }
        result = await emailService.sendEmail({
          to,
          subject: data.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${data.subject}</h2>
              <div>${data.message}</div>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                Sent from ${env.APP_NAME} at ${new Date().toLocaleString()}
              </p>
            </div>
          `,
          text: `${data.subject}\n\n${data.message}\n\nSent from ${env.APP_NAME} at ${new Date().toLocaleString()}`
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: {
            message: 'Invalid email type. Supported types: verification, test, custom',
            code: 'INVALID_EMAIL_TYPE'
          }
        }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Email sent successfully',
          type,
          recipient: to
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Failed to send email',
          code: 'EMAIL_SEND_FAILED'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error while sending email',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 });
  }
}
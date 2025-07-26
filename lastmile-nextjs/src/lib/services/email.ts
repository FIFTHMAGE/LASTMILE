/**
 * Email service for sending various types of emails
 */
import nodemailer from 'nodemailer';
import { env } from '@/lib/config/env';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface VerificationEmailData {
  userName: string;
  verificationUrl: string;
  expiresIn: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface OrderNotificationEmailData {
  userName: string;
  orderId: string;
  status: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface WelcomeEmailData {
  userName: string;
  userType: 'business' | 'rider';
  dashboardUrl: string;
  supportUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
        console.warn('SMTP configuration incomplete. Email service will be disabled.');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: env.NODE_ENV === 'production',
        },
      });

      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${env.APP_NAME}" <${env.SMTP_FROM || env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, data: VerificationEmailData): Promise<boolean> {
    const template = this.getVerificationEmailTemplate(data);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<boolean> {
    const template = this.getPasswordResetEmailTemplate(data);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    const template = this.getWelcomeEmailTemplate(data);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send order notification email
   */
  async sendOrderNotificationEmail(to: string, data: OrderNotificationEmailData): Promise<boolean> {
    const template = this.getOrderNotificationEmailTemplate(data);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Get verification email template
   */
  private getVerificationEmailTemplate(data: VerificationEmailData): EmailTemplate {
    const subject = `Verify your ${env.APP_NAME} account`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${env.APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${data.userName}!</h2>
              <p>Thank you for signing up for ${env.APP_NAME}. To complete your registration, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb;">${data.verificationUrl}</p>
              
              <p><strong>This link will expire in ${data.expiresIn}.</strong></p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${env.APP_NAME}!
      
      Hi ${data.userName},
      
      Thank you for signing up for ${env.APP_NAME}. To complete your registration, please verify your email address by visiting this link:
      
      ${data.verificationUrl}
      
      This link will expire in ${data.expiresIn}.
      
      If you didn't create an account with us, please ignore this email.
      
      © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Get password reset email template
   */
  private getPasswordResetEmailTemplate(data: PasswordResetEmailData): EmailTemplate {
    const subject = `Reset your ${env.APP_NAME} password`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${env.APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hi ${data.userName},</p>
              <p>We received a request to reset your password for your ${env.APP_NAME} account. Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${data.resetUrl}</p>
              
              <div class="warning">
                <p><strong>Important:</strong> This link will expire in ${data.expiresIn}. If you don't reset your password within this time, you'll need to request a new reset link.</p>
              </div>
              
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request - ${env.APP_NAME}
      
      Hi ${data.userName},
      
      We received a request to reset your password for your ${env.APP_NAME} account. Visit this link to reset your password:
      
      ${data.resetUrl}
      
      This link will expire in ${data.expiresIn}.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Get welcome email template
   */
  private getWelcomeEmailTemplate(data: WelcomeEmailData): EmailTemplate {
    const subject = `Welcome to ${env.APP_NAME}!`;
    const userTypeText = data.userType === 'business' ? 'Business' : 'Rider';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .features { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .feature { margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${env.APP_NAME}!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.userName},</h2>
              <p>Congratulations! Your ${userTypeText} account has been successfully created and verified.</p>
              
              <div class="features">
                <h3>What's next?</h3>
                ${data.userType === 'business' ? `
                  <div class="feature">📦 Create your first delivery request</div>
                  <div class="feature">📍 Track deliveries in real-time</div>
                  <div class="feature">💳 Manage payments and billing</div>
                  <div class="feature">📊 View delivery analytics</div>
                ` : `
                  <div class="feature">🚚 Browse available delivery opportunities</div>
                  <div class="feature">💰 Start earning with flexible schedules</div>
                  <div class="feature">📱 Use our mobile-friendly platform</div>
                  <div class="feature">⭐ Build your rider rating</div>
                `}
              </div>
              
              <div style="text-align: center;">
                <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team:</p>
              <p><a href="${data.supportUrl}" style="color: #059669;">Contact Support</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${env.APP_NAME}!
      
      Hi ${data.userName},
      
      Congratulations! Your ${userTypeText} account has been successfully created and verified.
      
      What's next?
      ${data.userType === 'business' ? `
      - Create your first delivery request
      - Track deliveries in real-time
      - Manage payments and billing
      - View delivery analytics
      ` : `
      - Browse available delivery opportunities
      - Start earning with flexible schedules
      - Use our mobile-friendly platform
      - Build your rider rating
      `}
      
      Get started: ${data.dashboardUrl}
      
      If you have any questions or need help getting started, contact our support team: ${data.supportUrl}
      
      © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Get order notification email template
   */
  private getOrderNotificationEmailTemplate(data: OrderNotificationEmailData): EmailTemplate {
    const statusMessages = {
      created: 'Your delivery request has been created',
      accepted: 'A rider has accepted your delivery',
      picked_up: 'Your package has been picked up',
      in_transit: 'Your package is on the way',
      delivered: 'Your package has been delivered',
      completed: 'Your delivery has been completed',
      cancelled: 'Your delivery has been cancelled',
    };

    const statusColors = {
      created: '#6b7280',
      accepted: '#2563eb',
      picked_up: '#059669',
      in_transit: '#d97706',
      delivered: '#059669',
      completed: '#059669',
      cancelled: '#dc2626',
    };

    const message = statusMessages[data.status as keyof typeof statusMessages] || 'Your delivery status has been updated';
    const color = statusColors[data.status as keyof typeof statusColors] || '#6b7280';
    const subject = `${message} - Order #${data.orderId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .status-box { background: white; border-left: 4px solid ${color}; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${env.APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.userName},</h2>
              
              <div class="status-box">
                <h3 style="margin-top: 0; color: ${color};">${message}</h3>
                <p><strong>Order ID:</strong> #${data.orderId}</p>
                <p><strong>Status:</strong> ${data.status.replace('_', ' ').toUpperCase()}</p>
                ${data.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
              </div>
              
              ${data.trackingUrl ? `
                <div style="text-align: center;">
                  <a href="${data.trackingUrl}" class="button">Track Your Delivery</a>
                </div>
              ` : ''}
              
              <p>Thank you for using ${env.APP_NAME} for your delivery needs!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ${message} - ${env.APP_NAME}
      
      Hi ${data.userName},
      
      ${message}
      
      Order ID: #${data.orderId}
      Status: ${data.status.replace('_', ' ').toUpperCase()}
      ${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}
      
      ${data.trackingUrl ? `Track your delivery: ${data.trackingUrl}` : ''}
      
      Thank you for using ${env.APP_NAME} for your delivery needs!
      
      © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
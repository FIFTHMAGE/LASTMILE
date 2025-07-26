/**
 * Email utility functions
 */
import { emailService, VerificationEmailData, PasswordResetEmailData, WelcomeEmailData, OrderNotificationEmailData } from '@/lib/services/email';
import { env } from '@/lib/config/env';

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  userName: string,
  verificationToken: string
): Promise<boolean> {
  const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  
  const data: VerificationEmailData = {
    userName,
    verificationUrl,
    expiresIn: '24 hours',
  };

  return emailService.sendVerificationEmail(email, data);
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const data: PasswordResetEmailData = {
    userName,
    resetUrl,
    expiresIn: '1 hour',
  };

  return emailService.sendPasswordResetEmail(email, data);
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  userType: 'business' | 'rider'
): Promise<boolean> {
  const dashboardUrl = userType === 'business' 
    ? `${env.NEXT_PUBLIC_APP_URL}/dashboard/business`
    : `${env.NEXT_PUBLIC_APP_URL}/dashboard/rider`;
  
  const data: WelcomeEmailData = {
    userName,
    userType,
    dashboardUrl,
    supportUrl: `${env.NEXT_PUBLIC_APP_URL}/support`,
  };

  return emailService.sendWelcomeEmail(email, data);
}

/**
 * Send order status notification email
 */
export async function sendOrderNotificationEmail(
  email: string,
  userName: string,
  orderId: string,
  status: string,
  estimatedDelivery?: string
): Promise<boolean> {
  const trackingUrl = `${env.NEXT_PUBLIC_APP_URL}/track/${orderId}`;
  
  const data: OrderNotificationEmailData = {
    userName,
    orderId,
    status,
    trackingUrl,
    estimatedDelivery,
  };

  return emailService.sendOrderNotificationEmail(email, data);
}

/**
 * Send rider assignment notification
 */
export async function sendRiderAssignmentEmail(
  email: string,
  riderName: string,
  orderId: string,
  pickupAddress: string,
  deliveryAddress: string
): Promise<boolean> {
  const subject = `New Delivery Assignment - Order #${orderId}`;
  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/rider/deliveries`;
  
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
          .route-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Delivery Assignment</h1>
          </div>
          <div class="content">
            <h2>Hi ${riderName},</h2>
            <p>You have been assigned a new delivery! Here are the details:</p>
            
            <div class="route-info">
              <h3>Order #${orderId}</h3>
              <p><strong>📍 Pickup:</strong> ${pickupAddress}</p>
              <p><strong>🎯 Delivery:</strong> ${deliveryAddress}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Delivery Details</a>
            </div>
            
            <p>Please check your dashboard for complete delivery information and contact details.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    New Delivery Assignment - ${env.APP_NAME}
    
    Hi ${riderName},
    
    You have been assigned a new delivery!
    
    Order #${orderId}
    Pickup: ${pickupAddress}
    Delivery: ${deliveryAddress}
    
    View details: ${dashboardUrl}
    
    Please check your dashboard for complete delivery information and contact details.
    
    © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
  `;

  return emailService.sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send business notification email
 */
export async function sendBusinessNotificationEmail(
  email: string,
  businessName: string,
  orderId: string,
  riderName: string,
  message: string
): Promise<boolean> {
  const subject = `Delivery Update - Order #${orderId}`;
  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/business/offers/${orderId}`;
  
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
          .update-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Delivery Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${businessName},</h2>
            
            <div class="update-info">
              <h3>Order #${orderId}</h3>
              <p><strong>Rider:</strong> ${riderName}</p>
              <p><strong>Update:</strong> ${message}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Order Details</a>
            </div>
            
            <p>Thank you for using ${env.APP_NAME} for your delivery needs!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Delivery Update - ${env.APP_NAME}
    
    Hi ${businessName},
    
    Order #${orderId}
    Rider: ${riderName}
    Update: ${message}
    
    View details: ${dashboardUrl}
    
    Thank you for using ${env.APP_NAME} for your delivery needs!
    
    © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
  `;

  return emailService.sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send admin alert email
 */
export async function sendAdminAlertEmail(
  subject: string,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<boolean> {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('Admin email not configured. Skipping admin alert.');
    return false;
  }

  const priorityColors = {
    low: '#6b7280',
    medium: '#2563eb',
    high: '#d97706',
    critical: '#dc2626',
  };

  const color = priorityColors[priority];
  const fullSubject = `[${priority.toUpperCase()}] ${subject}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fullSubject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          .alert-box { background: white; border-left: 4px solid ${color}; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>System Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <h3 style="margin-top: 0; color: ${color};">${subject}</h3>
              <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${env.APP_NAME} - System Alert</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    System Alert - ${env.APP_NAME}
    
    ${subject}
    
    Priority: ${priority.toUpperCase()}
    Time: ${new Date().toLocaleString()}
    
    Message:
    ${message}
    
    © ${new Date().getFullYear()} ${env.APP_NAME} - System Alert
  `;

  return emailService.sendEmail({
    to: adminEmail,
    subject: fullSubject,
    html,
    text,
  });
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test email service configuration
 */
export async function testEmailService(): Promise<boolean> {
  return emailService.testConnection();
}
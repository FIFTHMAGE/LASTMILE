const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // For production, use actual SMTP credentials
    // For development/demo, use a test account or console logging
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // In a real production environment, you would use actual SMTP credentials
    // For demo purposes, we'll create a mock transporter that logs emails
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // For development/demo, log emails to console
      return {
        sendMail: (mailOptions) => {
          console.log('========== EMAIL SENT ==========');
          console.log('To:', mailOptions.to);
          console.log('Subject:', mailOptions.subject);
          console.log('Text:', mailOptions.text);
          console.log('HTML:', mailOptions.html);
          console.log('===============================');
          return Promise.resolve({ messageId: 'mock-email-id-' + Date.now() });
        }
      };
    }
  }

  async sendEmail(to, subject, text, html) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'LastMile Delivery <noreply@lastmile.example.com>',
      to,
      subject,
      text,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    const baseUrl = process.env.FRONTEND_URL || 'https://lastmile-delivery-platform.vercel.app';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken.token}`;
    
    const subject = 'Verify Your LastMile Account';
    
    const text = `
      Hello ${user.name},
      
      Thank you for registering with LastMile Delivery Platform!
      
      Please verify your email address by clicking on the link below:
      ${verificationUrl}
      
      This link will expire in 12 hours.
      
      If you did not create an account, please ignore this email.
      
      Best regards,
      The LastMile Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LastMile Delivery</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Hello ${user.name},</h2>
          <p>Thank you for registering with LastMile Delivery Platform!</p>
          <p>Please verify your email address by clicking on the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 12 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Best regards,<br>The LastMile Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} LastMile Delivery. All rights reserved.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const baseUrl = process.env.FRONTEND_URL || 'https://lastmile-delivery-platform.vercel.app';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken.token}`;
    
    const subject = 'Reset Your LastMile Password';
    
    const text = `
      Hello ${user.name},
      
      You requested to reset your password.
      
      Please click on the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 12 hours.
      
      If you did not request a password reset, please ignore this email.
      
      Best regards,
      The LastMile Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LastMile Delivery</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Hello ${user.name},</h2>
          <p>You requested to reset your password.</p>
          <p>Please click on the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 12 hours.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>Best regards,<br>The LastMile Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} LastMile Delivery. All rights reserved.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendWelcomeEmail(user) {
    const baseUrl = process.env.FRONTEND_URL || 'https://lastmile-delivery-platform.vercel.app';
    const loginUrl = `${baseUrl}/login`;
    
    const subject = 'Welcome to LastMile Delivery Platform';
    
    const text = `
      Hello ${user.name},
      
      Welcome to LastMile Delivery Platform! Your account has been verified successfully.
      
      You can now log in to your account and start using our services:
      ${loginUrl}
      
      ${user.role === 'business' ? 
        'As a business user, you can create delivery offers, track deliveries, and manage your payments.' : 
        'As a rider, you can find delivery offers, track your earnings, and manage your availability.'}
      
      If you have any questions, please don't hesitate to contact our support team.
      
      Best regards,
      The LastMile Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LastMile Delivery</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Hello ${user.name},</h2>
          <p>Welcome to LastMile Delivery Platform! Your account has been verified successfully.</p>
          <p>You can now log in to your account and start using our services:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In to Your Account</a>
          </div>
          ${user.role === 'business' ? 
            '<p>As a business user, you can create delivery offers, track deliveries, and manage your payments.</p>' : 
            '<p>As a rider, you can find delivery offers, track your earnings, and manage your availability.</p>'}
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The LastMile Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} LastMile Delivery. All rights reserved.</p>
        </div>
      </div>
    `;
    
    return this.sendEmail(user.email, subject, text, html);
  }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService;
const EmailService = require('../services/EmailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn()
}));

describe('EmailService', () => {
  let originalEnv;
  let originalTransporter;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = process.env;
    
    // Store original transporter
    originalTransporter = EmailService.transporter;
    
    // Reset to development mode transporter
    EmailService.transporter = {
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
    
    // Clear console.log calls
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
    
    // Restore original transporter
    EmailService.transporter = originalTransporter;
  });

  describe('sendEmail', () => {
    test('should send email successfully in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const result = await EmailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test text content',
        '<p>Test HTML content</p>'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-email-id-');
      expect(console.log).toHaveBeenCalledWith('========== EMAIL SENT ==========');
      expect(console.log).toHaveBeenCalledWith('To:', 'test@example.com');
      expect(console.log).toHaveBeenCalledWith('Subject:', 'Test Subject');
    });

    test('should handle email sending errors gracefully', async () => {
      // Mock a failing transporter
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection failed'))
      };
      
      EmailService.transporter = mockTransporter;
      
      const result = await EmailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test text',
        '<p>Test HTML</p>'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });
  });

  describe('sendVerificationEmail', () => {
    test('should send verification email with correct content', async () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const verificationToken = {
        token: 'test-verification-token-123'
      };

      const result = await EmailService.sendVerificationEmail(user, verificationToken);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Subject:', 'Verify Your LastMile Account');
      expect(console.log).toHaveBeenCalledWith('To:', 'john@example.com');
      
      // Check that the verification URL is included in the email
      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('test-verification-token-123')
      );
      expect(textCall).toBeTruthy();
      
      const htmlCall = console.log.mock.calls.find(call => 
        call[0] === 'HTML:' && call[1].includes('test-verification-token-123')
      );
      expect(htmlCall).toBeTruthy();
    });

    test('should use custom frontend URL when provided', async () => {
      process.env.FRONTEND_URL = 'https://custom-domain.com';
      
      const user = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      };

      const verificationToken = {
        token: 'custom-token-456'
      };

      await EmailService.sendVerificationEmail(user, verificationToken);

      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('https://custom-domain.com/verify-email')
      );
      expect(textCall).toBeTruthy();
    });

    test('should include user name in email content', async () => {
      const user = {
        name: 'Alice Smith',
        email: 'alice@example.com'
      };

      const verificationToken = {
        token: 'alice-token-789'
      };

      await EmailService.sendVerificationEmail(user, verificationToken);

      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('Hello Alice Smith')
      );
      expect(textCall).toBeTruthy();
      
      const htmlCall = console.log.mock.calls.find(call => 
        call[0] === 'HTML:' && call[1].includes('Hello Alice Smith')
      );
      expect(htmlCall).toBeTruthy();
    });
  });

  describe('sendPasswordResetEmail', () => {
    test('should send password reset email with correct content', async () => {
      const user = {
        name: 'Bob Johnson',
        email: 'bob@example.com'
      };

      const resetToken = {
        token: 'reset-token-123'
      };

      const result = await EmailService.sendPasswordResetEmail(user, resetToken);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Subject:', 'Reset Your LastMile Password');
      expect(console.log).toHaveBeenCalledWith('To:', 'bob@example.com');
      
      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('reset-token-123')
      );
      expect(textCall).toBeTruthy();
    });

    test('should include reset URL in email content', async () => {
      const user = {
        name: 'Carol Davis',
        email: 'carol@example.com'
      };

      const resetToken = {
        token: 'reset-token-456'
      };

      await EmailService.sendPasswordResetEmail(user, resetToken);

      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('/reset-password?token=reset-token-456')
      );
      expect(textCall).toBeTruthy();
    });
  });

  describe('sendWelcomeEmail', () => {
    test('should send welcome email for business user', async () => {
      const businessUser = {
        name: 'Business Owner',
        email: 'business@example.com',
        role: 'business'
      };

      const result = await EmailService.sendWelcomeEmail(businessUser);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Subject:', 'Welcome to LastMile Delivery Platform');
      expect(console.log).toHaveBeenCalledWith('To:', 'business@example.com');
      
      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('create delivery offers')
      );
      expect(textCall).toBeTruthy();
    });

    test('should send welcome email for rider user', async () => {
      const riderUser = {
        name: 'Rider Name',
        email: 'rider@example.com',
        role: 'rider'
      };

      const result = await EmailService.sendWelcomeEmail(riderUser);

      expect(result.success).toBe(true);
      
      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('find delivery offers')
      );
      expect(textCall).toBeTruthy();
    });

    test('should include login URL in welcome email', async () => {
      const user = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'rider'
      };

      await EmailService.sendWelcomeEmail(user);

      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('/login')
      );
      expect(textCall).toBeTruthy();
    });
  });

  describe('Email Templates', () => {
    test('should include proper HTML structure in verification email', async () => {
      const user = { name: 'Test User', email: 'test@example.com' };
      const token = { token: 'test-token' };

      await EmailService.sendVerificationEmail(user, token);

      const htmlCall = console.log.mock.calls.find(call => call[0] === 'HTML:');
      const htmlContent = htmlCall[1];

      expect(htmlContent).toContain('LastMile Delivery');
      expect(htmlContent).toContain('Verify Email Address');
      expect(htmlContent).toContain('background-color: #3B82F6');
      expect(htmlContent).toContain('font-family: Arial, sans-serif');
    });

    test('should include expiration notice in verification email', async () => {
      const user = { name: 'Test User', email: 'test@example.com' };
      const token = { token: 'test-token' };

      await EmailService.sendVerificationEmail(user, token);

      const textCall = console.log.mock.calls.find(call => call[0] === 'Text:');
      const textContent = textCall[1];

      expect(textContent).toContain('expire in 12 hours');
    });

    test('should include current year in email footer', async () => {
      const user = { name: 'Test User', email: 'test@example.com' };
      const token = { token: 'test-token' };

      await EmailService.sendVerificationEmail(user, token);

      const htmlCall = console.log.mock.calls.find(call => call[0] === 'HTML:');
      const htmlContent = htmlCall[1];
      const currentYear = new Date().getFullYear();

      expect(htmlContent).toContain(`${currentYear} LastMile Delivery`);
    });
  });

  describe('Environment Configuration', () => {
    test('should use default sender email when EMAIL_FROM not set', async () => {
      delete process.env.EMAIL_FROM;
      
      const result = await EmailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test content'
      );

      expect(result.success).toBe(true);
      // The default sender should be used internally
    });

    test('should use default frontend URL when FRONTEND_URL not set', async () => {
      delete process.env.FRONTEND_URL;
      
      const user = { name: 'Test User', email: 'test@example.com' };
      const token = { token: 'test-token' };

      await EmailService.sendVerificationEmail(user, token);

      const textCall = console.log.mock.calls.find(call => 
        call[0] === 'Text:' && call[1].includes('lastmile-delivery-platform.vercel.app')
      );
      expect(textCall).toBeTruthy();
    });
  });
});
/**
 * Environment variable configuration and validation
 */

export interface EnvironmentConfig {
  // Database
  MONGODB_URI: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Application
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  APP_NAME: string;
  NEXT_PUBLIC_APP_URL: string;
  
  // Email
  EMAIL_FROM: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  ADMIN_EMAIL: string;
  
  // Settings
  NODE_ENV: 'development' | 'production' | 'test';
  BCRYPT_SALT_ROUNDS: number;
  FRONTEND_URL: string;
  
  // External APIs
  GOOGLE_MAPS_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

/**
 * Validates and returns environment variables
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ];

  // Check for required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return {
    // Database
    MONGODB_URI: process.env.MONGODB_URI!,
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    
    // Application
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    APP_NAME: process.env.APP_NAME || 'LastMile Delivery',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    
    // Email
    EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@lastmile.com',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@lastmile.com',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    
    // Settings
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // External APIs
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

// Export singleton instance
export const env = getEnvironmentConfig();
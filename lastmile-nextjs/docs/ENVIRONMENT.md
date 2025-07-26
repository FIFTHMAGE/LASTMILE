# Environment Configuration

This document describes all environment variables used in the LastMile Delivery Platform Next.js application.

## Required Environment Variables

### Database Configuration
- `MONGODB_URI` - MongoDB connection string (required)
  - Example: `mongodb://localhost:27017/lastmile-delivery`
  - Production: Use MongoDB Atlas connection string

### Authentication Configuration
- `JWT_SECRET` - Secret key for JWT token signing (required, minimum 32 characters)
  - Example: `your-super-secret-jwt-key-minimum-32-characters-long-for-security`
  - Generate: `openssl rand -base64 32`

- `NEXTAUTH_SECRET` - Secret for NextAuth.js session management (required)
  - Example: `your-nextauth-secret-key-for-session-management`
  - Generate: `openssl rand -base64 32`

## Optional Environment Variables

### Application Configuration
- `NEXTAUTH_URL` - Base URL of the application
  - Default: `http://localhost:3000`
  - Production: Set to your domain (e.g., `https://yourdomain.com`)

- `JWT_EXPIRES_IN` - JWT token expiration time
  - Default: `7d` (7 days)
  - Format: Use time strings like `1h`, `24h`, `7d`, `30d`

- `NODE_ENV` - Application environment
  - Default: `development`
  - Options: `development`, `production`, `test`

- `FRONTEND_URL` - Frontend URL for email links
  - Default: `http://localhost:3000`
  - Production: Set to your frontend domain

### Email Configuration
- `EMAIL_FROM` - From email address for system emails
  - Default: `noreply@lastmile.com`

- `SMTP_HOST` - SMTP server hostname
  - Default: `smtp.gmail.com`

- `SMTP_PORT` - SMTP server port
  - Default: `587`

- `SMTP_USER` - SMTP username/email
  - Required for email functionality

- `SMTP_PASS` - SMTP password or app password
  - Required for email functionality
  - For Gmail: Use App Password, not regular password

### Security Configuration
- `BCRYPT_SALT_ROUNDS` - Number of salt rounds for password hashing
  - Default: `12`
  - Higher values = more secure but slower

## Environment Files

### Development
Create `.env.local` in the project root with your development configuration.

### Production
Set environment variables in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Docker: Use environment variables or .env file
- Traditional hosting: Set in server environment

## Security Notes

1. **Never commit `.env.local` or any environment files to version control**
2. **Use strong, unique secrets for JWT_SECRET and NEXTAUTH_SECRET**
3. **Rotate secrets regularly in production**
4. **Use different secrets for different environments**
5. **For email, use app passwords instead of regular passwords**

## Validation

The application validates environment variables on startup:
- Checks for required variables
- Validates JWT_SECRET length (minimum 32 characters)
- Provides helpful error messages for missing configuration

## Example .env.local

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lastmile-delivery

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-security
JWT_EXPIRES_IN=7d

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-for-session-management

# Email (Optional)
EMAIL_FROM=noreply@lastmile.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Settings
NODE_ENV=development
BCRYPT_SALT_ROUNDS=12
FRONTEND_URL=http://localhost:3000
```
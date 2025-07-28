# 🔒 Secure Environment Setup Guide

## ⚠️ IMPORTANT SECURITY NOTICE

**Never commit sensitive data like database connection strings, API keys, or passwords to Git!**

## 🛡️ Environment Variables Setup

### 1. Local Development Setup

```bash
# Copy the template
cp .env.template .env.local

# Edit with your actual values
# Use a secure editor and never share this file
```

### 2. Required Environment Variables

#### Database (MongoDB Atlas)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
```
- Get from: https://cloud.mongodb.com/
- Create a new database user with read/write permissions
- Whitelist your IP addresses (use 0.0.0.0/0 for Vercel)

#### JWT Secrets
```bash
# Generate secure random keys:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Email Configuration
```bash
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
```

### 3. Vercel Deployment Setup

**Option A: Using Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add each variable manually

**Option B: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variables
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
# ... add all required variables
```

## 🔐 Security Best Practices

### 1. Database Security
- ✅ Use MongoDB Atlas with IP whitelisting
- ✅ Create dedicated database users with minimal permissions
- ✅ Use strong passwords
- ✅ Enable database encryption
- ❌ Never use admin credentials in applications

### 2. API Keys & Secrets
- ✅ Generate long, random secrets (minimum 32 characters)
- ✅ Use different secrets for different environments
- ✅ Rotate secrets regularly
- ❌ Never hardcode secrets in source code

### 3. Email Security
- ✅ Use App Passwords for Gmail
- ✅ Use dedicated email service accounts
- ✅ Enable 2FA on email accounts
- ❌ Never use personal email passwords

### 4. Git Security
- ✅ Always use .gitignore for sensitive files
- ✅ Check commits before pushing
- ✅ Use git hooks to prevent accidental commits
- ❌ Never commit .env files

## 🚨 If Credentials Are Compromised

### Immediate Actions:
1. **Change all passwords immediately**
2. **Rotate all API keys and secrets**
3. **Check database access logs**
4. **Review recent deployments**
5. **Update environment variables in Vercel**

### MongoDB Atlas:
1. Go to Database Access → Edit User → Change Password
2. Check Network Access for unauthorized IPs
3. Review Database Activity Monitoring

### Vercel:
1. Update all environment variables
2. Redeploy the application
3. Check deployment logs for suspicious activity

## 📋 Environment Variables Checklist

### Required for Basic Functionality:
- [ ] `MONGODB_URI` - Database connection
- [ ] `JWT_SECRET` - Authentication tokens
- [ ] `NEXTAUTH_SECRET` - NextAuth sessions
- [ ] `NEXTAUTH_URL` - Application URL
- [ ] `NEXT_PUBLIC_APP_URL` - Public app URL
- [ ] `NEXT_PUBLIC_API_URL` - API endpoint URL

### Required for Email:
- [ ] `SMTP_USER` - Email account
- [ ] `SMTP_PASS` - Email password/app password
- [ ] `EMAIL_FROM` - From address

### Optional Features:
- [ ] `STRIPE_SECRET_KEY` - Payment processing
- [ ] `GOOGLE_MAPS_API_KEY` - Maps and geocoding
- [ ] `REDIS_URL` - Caching (if using Redis)

## 🔧 Testing Your Setup

### 1. Test Database Connection
```bash
# Run the health check
curl https://lastmile.vercel.app/api/health
```

### 2. Test Environment Variables
```bash
# Use the diagnostic script
node scripts/test-backend-connection.js
```

### 3. Verify Security
```bash
# Check for exposed secrets
git log --all --full-history -- "*.env*"
git log --all --full-history -S "mongodb+srv"
```

## 📞 Need Help?

If you need assistance with environment setup:
1. Check the troubleshooting guide: `BACKEND_TROUBLESHOOTING.md`
2. Run diagnostics: `node scripts/test-backend-connection.js`
3. Verify Vercel environment variables in dashboard

Remember: **Security is not optional!** Always protect your credentials.
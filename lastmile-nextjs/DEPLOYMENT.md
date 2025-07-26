# LastMile Delivery Platform - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
- MongoDB Atlas database set up
- Stripe account (for payments)
- Google Maps API key (for geocoding)
- Email service configured (Gmail/SendGrid)

### 2. Environment Variables Setup

Before deploying, you need to set up the following environment variables in Vercel:

#### Required Variables
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lastmile-delivery
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://your-app-name.vercel.app
```

#### Email Configuration
```bash
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Payment Processing (Optional)
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Maps & Geocoding (Optional)
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Navigate to the Next.js directory
cd lastmile-nextjs

# Login to Vercel
vercel login

# Deploy (first time will prompt for configuration)
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set root directory to `lastmile-nextjs`
5. Configure environment variables
6. Deploy

### 4. Post-Deployment Configuration

#### Database Setup
1. Ensure MongoDB Atlas is configured with proper IP whitelist
2. Create database indexes for optimal performance
3. Set up database connection pooling

#### Domain Configuration
1. Add custom domain in Vercel dashboard
2. Update `NEXTAUTH_URL` environment variable
3. Update `NEXT_PUBLIC_APP_URL` environment variable

#### Email Setup
1. Configure SMTP settings
2. Test email delivery
3. Set up email templates

#### Payment Setup (if using Stripe)
1. Configure Stripe webhooks
2. Test payment flows
3. Set up webhook endpoints

## 🔧 Environment Variables Reference

### Core Application
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | ✅ | `your-secret-key` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | ✅ | `your-nextauth-secret` |
| `NEXTAUTH_URL` | Application URL | ✅ | `https://app.vercel.app` |

### Email Configuration
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EMAIL_FROM` | From email address | ✅ | `noreply@domain.com` |
| `SMTP_HOST` | SMTP server host | ✅ | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | ✅ | `587` |
| `SMTP_USER` | SMTP username | ✅ | `user@gmail.com` |
| `SMTP_PASS` | SMTP password | ✅ | `app-password` |

### Optional Services
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | ❌ | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ❌ | `pk_test_...` |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | ❌ | `AIza...` |
| `REDIS_URL` | Redis connection URL | ❌ | `redis://...` |

## 🛠️ Troubleshooting

### Common Issues

#### Build Errors
```bash
# Type checking errors
npm run type-check

# Linting errors
npm run lint

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Database Connection Issues
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Test connection locally first

#### Environment Variable Issues
- Ensure all required variables are set
- Check for typos in variable names
- Verify values are properly escaped

#### Email Delivery Issues
- Test SMTP credentials
- Check spam folders
- Verify email service configuration

### Performance Optimization

#### Database
- Create proper indexes
- Use connection pooling
- Implement caching where appropriate

#### Frontend
- Enable Next.js image optimization
- Use dynamic imports for large components
- Implement proper loading states

#### API
- Add rate limiting
- Implement response caching
- Use compression middleware

## 📊 Monitoring & Analytics

### Vercel Analytics
- Enable Vercel Analytics in dashboard
- Monitor Core Web Vitals
- Track user engagement

### Error Monitoring
- Set up error tracking (Sentry recommended)
- Monitor API response times
- Track user flows

### Performance Monitoring
- Use Vercel Speed Insights
- Monitor database query performance
- Track API endpoint usage

## 🔒 Security Checklist

- [ ] Environment variables properly configured
- [ ] JWT secrets are strong and unique
- [ ] Database access is restricted
- [ ] HTTPS is enforced
- [ ] Input validation is implemented
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Security headers are set

## 🚀 Going Live

### Pre-Launch Checklist
- [ ] All environment variables configured
- [ ] Database is properly set up
- [ ] Email delivery is working
- [ ] Payment processing is tested (if applicable)
- [ ] All features are tested in production
- [ ] Error monitoring is set up
- [ ] Performance is optimized
- [ ] Security measures are in place

### Launch Steps
1. Deploy to production
2. Test all critical user flows
3. Monitor error rates and performance
4. Set up alerts for critical issues
5. Document any post-launch issues

## 📞 Support

If you encounter issues during deployment:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Review the [Next.js deployment guide](https://nextjs.org/docs/deployment)
3. Check the application logs in Vercel dashboard
4. Test locally with production environment variables

## 🔄 Continuous Deployment

### Automatic Deployments
- Connect GitHub repository to Vercel
- Enable automatic deployments on push
- Set up preview deployments for pull requests

### Branch Strategy
- `main` branch → Production deployment
- `develop` branch → Preview deployment
- Feature branches → Preview deployments

### Environment Management
- Production environment variables
- Preview environment variables
- Development environment variables
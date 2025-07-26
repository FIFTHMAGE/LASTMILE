# 🚀 Deploy LastMile Delivery to Vercel - Step by Step

## ✅ Pre-deployment Check Complete!
All systems are ready for deployment. Follow these steps to deploy your LastMile Delivery platform to Vercel.

## 📋 Step-by-Step Deployment

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Navigate to Project Directory
```bash
cd lastmile-nextjs
```

### Step 4: Deploy to Vercel
```bash
vercel --prod
```

## 🔐 Required Environment Variables

You'll need to set these in the Vercel dashboard after deployment:

### Core Variables (Required)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lastmile-delivery
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=https://your-app-name.vercel.app
```

### Email Configuration (Required for notifications)
```
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional Services
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REDIS_URL=redis://your-redis-url
```

## 🎯 Quick Deploy Commands

### Option 1: Full Deployment with Checks
```bash
cd lastmile-nextjs
npm run deploy
```

### Option 2: Preview Deployment
```bash
cd lastmile-nextjs
npm run deploy:preview
```

### Option 3: Manual Deployment
```bash
cd lastmile-nextjs
npm run pre-deploy
vercel --prod
npm run post-deploy
```

## 🔧 Setting Environment Variables in Vercel

### Via Vercel Dashboard:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with its value
5. Redeploy the application

### Via Vercel CLI:
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
# ... add other variables
```

## 🗄️ Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Account
- Go to [mongodb.com/atlas](https://mongodb.com/atlas)
- Create a free cluster
- Create a database user
- Whitelist your IP (or use 0.0.0.0/0 for all IPs)

### 2. Get Connection String
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your database user password

### 3. Set Environment Variable
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lastmile-delivery?retryWrites=true&w=majority
```

## 📧 Email Setup (Gmail Example)

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Enable 2-factor authentication

### 2. Generate App Password
- Go to Google Account → Security → App passwords
- Generate a password for "Mail"
- Use this password (not your regular password)

### 3. Set Environment Variables
```
EMAIL_FROM=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

## 💳 Payment Setup (Stripe - Optional)

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com)
- Create an account
- Get your API keys from the dashboard

### 2. Set Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Set Up Webhooks
- In Stripe dashboard, go to Webhooks
- Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
- Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## 🗺️ Maps Setup (Google Maps - Optional)

### 1. Enable Google Maps API
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Enable Maps JavaScript API and Geocoding API
- Create an API key

### 2. Set Environment Variable
```
GOOGLE_MAPS_API_KEY=AIza...
```

## 🚀 Deployment Process

### What Happens During Deployment:
1. ✅ Pre-deployment checks run automatically
2. 🏗️ Next.js builds the application
3. 🚀 Vercel deploys to their CDN
4. 🔍 Post-deployment health checks run
5. 🎉 Your app is live!

### Expected Output:
```
🚀 LastMile Delivery - Pre-deployment Check
✅ All checks passed! Ready for deployment.

Building...
✅ Build completed successfully!

Deploying...
✅ Deployed to https://your-app-name.vercel.app

🔍 Running health checks...
✅ All health checks passed!
🎉 Deployment is healthy and ready!
```

## 🔍 Post-Deployment Testing

### 1. Run Health Check
```bash
npm run health-check
```

### 2. Test Core Features
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Business dashboard accessible
- [ ] Rider dashboard accessible
- [ ] Offer creation works
- [ ] Email notifications sent
- [ ] API endpoints respond correctly

### 3. Test User Flows
- [ ] Business user can create offers
- [ ] Rider user can view and accept offers
- [ ] Status updates work correctly
- [ ] Notifications are delivered
- [ ] Payment processing works (if configured)

## 🐛 Troubleshooting

### Common Issues:

#### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Environment Variable Issues
- Check spelling of variable names
- Ensure values don't have extra spaces
- Verify MongoDB connection string format
- Test email credentials separately

#### Database Connection Issues
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Test connection locally first

#### API Route Issues
- Check Vercel function logs
- Verify API route file structure
- Test endpoints individually

## 📊 Monitoring Your Deployment

### Vercel Dashboard
- Monitor deployment status
- View function logs
- Check performance metrics
- Monitor error rates

### Application Health
- Use the built-in health check: `/api/health`
- Monitor user registration and login
- Check email delivery
- Monitor database performance

## 🎉 Success! Your App is Live

Once deployed successfully, your LastMile Delivery platform will be available at:
**https://your-app-name.vercel.app**

### Next Steps:
1. 🧪 Test all features thoroughly
2. 👥 Create test user accounts
3. 📱 Test mobile responsiveness
4. 🔔 Verify notifications work
5. 💳 Test payment flows (if configured)
6. 📈 Set up monitoring and analytics
7. 🚀 Share with your users!

## 🆘 Need Help?

If you encounter issues:
1. Check the deployment logs in Vercel dashboard
2. Run the health check script
3. Verify all environment variables are set correctly
4. Test the application locally with production environment variables
5. Check the troubleshooting section in DEPLOYMENT.md

---

**Happy Deploying! 🚀**
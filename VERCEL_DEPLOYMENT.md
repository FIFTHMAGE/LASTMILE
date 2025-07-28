# 🚀 Vercel Deployment Guide - LastMile Delivery Platform

## Quick Fix for Backend Issues

### Problem
Your backend isn't working on Vercel because the configuration was pointing to the old Express.js setup instead of the new Next.js API routes.

### Solution Applied
✅ Updated root `vercel.json` to use Next.js app  
✅ Created `.vercelignore` to exclude old backend files  
✅ Fixed Next.js Vercel configuration  
✅ Created deployment scripts  

## 🔧 Step-by-Step Deployment

### 1. Environment Variables Setup

**Run the setup helper:**
```bash
npm run setup:vercel
```

**Required Variables (set these in Vercel dashboard):**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `NEXTAUTH_URL` - Your Vercel app URL

**Optional Variables:**
- `EMAIL_FROM`, `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- `GOOGLE_MAPS_API_KEY`

### 2. Set Environment Variables in Vercel

**Option A: Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable for **Production** environment

**Option B: Vercel CLI**
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

### 3. Deploy to Vercel

**Automated deployment:**
```bash
npm run deploy:vercel
```

**Manual deployment:**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod
```

### 4. Verify Deployment

After deployment, test these endpoints:
- `https://your-app.vercel.app/api/health` - Health check
- `https://your-app.vercel.app/api/auth/login` - Auth endpoint
- `https://your-app.vercel.app` - Main app

## 🔍 Troubleshooting

### Common Issues

**1. Build Errors**
```bash
cd lastmile-nextjs
npm run type-check
npm run lint
```

**2. Environment Variable Issues**
- Check all required variables are set in Vercel dashboard
- Verify variable names match exactly
- Ensure values don't have extra spaces

**3. Database Connection Issues**
- Verify MongoDB URI is correct
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for Vercel)
- Test connection locally first

**4. API Routes Not Working**
- Check file structure: `src/app/api/*/route.ts`
- Verify export names: `export async function GET()`, `export async function POST()`
- Check for TypeScript errors

### Debug Steps

**1. Check Vercel Function Logs**
```bash
vercel logs your-deployment-url
```

**2. Test Health Check**
```bash
curl https://your-app.vercel.app/api/health
```

**3. Local Testing**
```bash
cd lastmile-nextjs
npm run dev
# Test at http://localhost:3000
```

## 📁 Project Structure

```
lastmile-nextjs/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (this is your backend)
│   │   │   ├── auth/
│   │   │   ├── health/
│   │   │   ├── offers/
│   │   │   └── ...
│   │   ├── (auth)/        # Auth pages
│   │   ├── dashboard/     # Dashboard pages
│   │   └── page.tsx       # Home page
│   ├── components/        # React components
│   ├── lib/              # Utilities and services
│   └── ...
├── vercel.json           # Vercel configuration
└── package.json
```

## 🔒 Security Checklist

- [ ] All environment variables set in Vercel
- [ ] MongoDB Atlas IP whitelist configured
- [ ] JWT secrets are strong and unique
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CORS properly configured

## 🚀 Post-Deployment

### 1. Test All Features
- User registration/login
- Dashboard functionality
- API endpoints
- Database operations

### 2. Monitor Performance
- Check Vercel Analytics
- Monitor function execution times
- Watch for errors in logs

### 3. Set Up Monitoring
- Configure error tracking
- Set up uptime monitoring
- Monitor database performance

## 📞 Need Help?

If you encounter issues:

1. **Check the logs:** `vercel logs`
2. **Test locally:** `npm run dev:nextjs`
3. **Verify environment variables:** Check Vercel dashboard
4. **Database connection:** Test MongoDB URI locally

## 🔄 Continuous Deployment

Your app will automatically redeploy when you push to your main branch. To disable this:

1. Go to Vercel dashboard
2. Project Settings → Git
3. Configure deployment branches

---

**Ready to deploy?** Run: `npm run deploy:vercel`
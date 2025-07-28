# Backend Connection Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. Environment Variables Not Set in Vercel

**Symptoms:**
- API endpoints return 500 errors
- Database connection failures
- Authentication not working

**Solution:**
```bash
# Run the environment setup script
cd lastmile-nextjs
node scripts/setup-vercel-env.js

# Or manually set in Vercel dashboard
# Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
```

**Required Variables:**
- `MONGODB_URI`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`

### 2. Database Connection Issues

**Symptoms:**
- `/api/health` returns database: unhealthy
- MongoDB connection timeouts
- Authentication failures

**Solutions:**

#### Check MongoDB Atlas Configuration:
1. **IP Whitelist:** Add `0.0.0.0/0` to allow all IPs (for Vercel)
2. **Database User:** Ensure user has read/write permissions
3. **Connection String:** Verify the MONGODB_URI format

#### Test Database Connection:
```bash
# Test locally first
cd lastmile-nextjs
npm run dev
# Visit: http://localhost:3000/api/health

# Test production
node scripts/test-backend-connection.js
```

### 3. API Routes Not Working

**Symptoms:**
- 404 errors on API endpoints
- Routes not found
- Incorrect file structure

**Solutions:**

#### Verify File Structure:
```
src/app/api/
├── health/
│   └── route.ts
├── auth/
│   ├── login/
│   │   └── route.ts
│   └── register/
│       └── route.ts
└── offers/
    └── route.ts
```

#### Check Route Exports:
```typescript
// Each route.ts must export HTTP methods
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

### 4. CORS Issues

**Symptoms:**
- Frontend can't connect to API
- CORS policy errors in browser
- OPTIONS requests failing

**Solution:**
Verify `vercel.json` configuration:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 5. Build/Deployment Errors

**Symptoms:**
- Deployment fails
- TypeScript errors
- Missing dependencies

**Solutions:**

#### Check Build Logs:
```bash
# Local build test
npm run build

# Check Vercel deployment logs
vercel logs
```

#### Common Fixes:
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build

# Fix TypeScript errors
npm run type-check
```

## 🔧 Diagnostic Tools

### 1. Test Backend Connection
```bash
cd lastmile-nextjs
node scripts/test-backend-connection.js
```

### 2. Setup Environment Variables
```bash
cd lastmile-nextjs
node scripts/setup-vercel-env.js
```

### 3. Health Check Endpoint
Visit: `https://lastmile.vercel.app/api/health`

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "memory": "healthy",
    "responseTime": "healthy",
    "environment": "healthy"
  },
  "uptime": 123.45,
  "version": "1.0.0"
}
```

## 🚀 Quick Fix Checklist

### Immediate Actions:
- [ ] Check if `https://lastmile.vercel.app/api/health` returns 200
- [ ] Verify environment variables in Vercel dashboard
- [ ] Test MongoDB connection from MongoDB Atlas dashboard
- [ ] Check Vercel deployment logs for errors
- [ ] Ensure all required files are committed to Git

### Environment Variables Checklist:
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - At least 32 characters
- [ ] `NEXTAUTH_SECRET` - NextAuth secret key
- [ ] `NEXTAUTH_URL` - https://lastmile.vercel.app
- [ ] `NEXT_PUBLIC_APP_URL` - https://lastmile.vercel.app
- [ ] `NEXT_PUBLIC_API_URL` - https://lastmile.vercel.app/api

### File Structure Checklist:
- [ ] `src/app/api/health/route.ts` exists
- [ ] `src/lib/services/database.ts` exists
- [ ] `vercel.json` configured correctly
- [ ] `package.json` has all dependencies

## 📞 Getting Help

If issues persist:

1. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```

2. **Test Locally:**
   ```bash
   npm run dev
   # Test: http://localhost:3000/api/health
   ```

3. **Database Connection Test:**
   - Login to MongoDB Atlas
   - Use "Connect" → "Connect your application"
   - Test connection string

4. **Environment Variables:**
   - Verify in Vercel dashboard
   - Ensure no extra spaces or quotes
   - Check for special characters

## 🔍 Common Error Messages

### "Database connection failed"
- Check MONGODB_URI format
- Verify MongoDB Atlas IP whitelist
- Ensure database user permissions

### "Missing required environment variable"
- Set missing variables in Vercel dashboard
- Redeploy after setting variables

### "Cannot read properties of undefined"
- Check environment variable names
- Verify .env.local vs production variables

### "Function timeout"
- Optimize database queries
- Check MongoDB Atlas performance
- Increase Vercel function timeout

## 📈 Performance Optimization

### Database Connection:
- Use connection pooling
- Implement proper error handling
- Add retry logic for failed connections

### API Routes:
- Add request validation
- Implement proper error responses
- Use middleware for common functionality

### Monitoring:
- Set up error tracking
- Monitor API response times
- Track database performance
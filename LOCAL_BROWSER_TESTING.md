# 🌐 Local Browser Testing Guide

## Quick Start

### 1. Start the Backend Server
```bash
npm start
# or
node server.js
```
The backend will run on: **http://localhost:5000**

### 2. Start the Frontend (React)
```bash
cd frontend
npm start
```
The frontend will run on: **http://localhost:3000**

### 3. Alternative: Next.js Application
```bash
cd lastmile-nextjs
npm run dev
```
The Next.js app will run on: **http://localhost:3000**

---

## 🧪 Testing Features

### Authentication Testing
- **Register Business**: http://localhost:3000/register (select Business)
- **Register Rider**: http://localhost:3000/register (select Rider)
- **Login**: http://localhost:3000/login
- **Email Verification**: Check console logs for verification links

### API Testing Endpoints
- **Health Check**: http://localhost:5000/api/health
- **Register Business**: POST http://localhost:5000/api/auth/register/business
- **Register Rider**: POST http://localhost:5000/api/auth/register/rider
- **Login**: POST http://localhost:5000/api/auth/login
- **Resend Verification**: POST http://localhost:5000/api/auth/resend-verification

### Dashboard Testing
- **Business Dashboard**: http://localhost:3000/dashboard/business
- **Rider Dashboard**: http://localhost:3000/dashboard/rider
- **Admin Dashboard**: http://localhost:3000/dashboard/admin

---

## 🔧 Environment Setup

### Backend Environment (.env)
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
EMAIL_FROM=LastMile Delivery <noreply@lastmile.example.com>

# Optional: Real email service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend Environment (frontend/.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=LastMile Delivery
```

---

## 📧 Email Verification Testing

Since we're in development mode, verification emails are logged to the console:

1. **Register a new user**
2. **Check the server console** for email output
3. **Copy the verification link** from the console
4. **Paste it in your browser** to verify the account

Example console output:
```
========== EMAIL SENT ==========
To: user@example.com
Subject: Verify Your LastMile Account
Verification Link: http://localhost:3000/verify-email?token=abc123...
===============================
```

---

## 🧪 Test Data

### Sample Business Registration
```json
{
  "name": "John Doe",
  "email": "business@example.com",
  "password": "password123",
  "businessName": "Quick Delivery Co",
  "businessAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "businessPhone": "+1-555-0123"
}
```

### Sample Rider Registration
```json
{
  "name": "Jane Smith",
  "email": "rider@example.com",
  "password": "password123",
  "phone": "+1-555-0456",
  "vehicleType": "bike"
}
```

---

## 🔍 Browser Testing Checklist

### ✅ Authentication Flow
- [ ] Business registration works
- [ ] Rider registration works
- [ ] Login redirects to correct dashboard
- [ ] Email verification links work
- [ ] Resend verification works
- [ ] Logout functionality

### ✅ Dashboard Access
- [ ] Business dashboard loads
- [ ] Rider dashboard loads
- [ ] Role-based navigation works
- [ ] Profile information displays correctly

### ✅ API Endpoints
- [ ] All endpoints return proper responses
- [ ] Error handling works correctly
- [ ] Rate limiting functions properly
- [ ] CORS is configured correctly

---

## 🐛 Troubleshooting

### Common Issues

**1. CORS Errors**
- Make sure backend is running on port 5000
- Check that CORS is enabled in server.js

**2. Email Verification Not Working**
- Check server console for email logs
- Verify the token in the URL is correct
- Make sure VerificationToken model is working

**3. Dashboard Not Loading**
- Check if user is logged in
- Verify JWT token is valid
- Check browser console for errors

**4. API Calls Failing**
- Verify backend server is running
- Check network tab in browser dev tools
- Ensure API URLs are correct

---

## 🚀 Advanced Testing

### Using Browser Dev Tools
1. **Network Tab**: Monitor API calls
2. **Console**: Check for JavaScript errors
3. **Application Tab**: Inspect localStorage/sessionStorage
4. **Sources Tab**: Debug frontend code

### Testing with Postman
Import the API collection from `docs/postman-collection.json` for comprehensive API testing.

### Mobile Testing
- Use browser dev tools device emulation
- Test responsive design
- Verify touch interactions work

---

## 📱 Mobile Browser Testing

### iOS Safari
- Open http://localhost:3000 on iPhone/iPad
- Test touch gestures and forms

### Android Chrome
- Use Chrome remote debugging
- Test various screen sizes

---

## 🔐 Security Testing

### Test Authentication
- Try accessing protected routes without login
- Test with expired tokens
- Verify role-based access control

### Test Input Validation
- Submit forms with invalid data
- Test SQL injection attempts
- Verify XSS protection

---

## 📊 Performance Testing

### Browser Performance
- Use Lighthouse audit
- Check Core Web Vitals
- Monitor memory usage

### Network Performance
- Test with slow 3G simulation
- Check bundle sizes
- Verify caching works

---

## 🎯 Next Steps

1. **Start both servers** (backend and frontend)
2. **Open browser** to http://localhost:3000
3. **Register test accounts** for both business and rider
4. **Test the complete user flow**
5. **Check email verification** in console logs
6. **Explore dashboards** and features

Happy testing! 🚀
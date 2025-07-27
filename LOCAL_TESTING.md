# 🧪 Local Testing Guide - LastMile Delivery Platform

## 📋 Testing Overview

This guide covers comprehensive local testing for both the Node.js backend and Next.js frontend.

### 🏗️ **Architecture**
- **Backend**: Node.js + Express + MongoDB + Redis
- **Frontend**: Next.js + React + TypeScript
- **Testing**: Jest + Supertest + MongoDB Memory Server

## 🚀 **Quick Start Testing**

### 1. **Install Dependencies**
```bash
# Install root dependencies
npm install

# Install Next.js dependencies
cd lastmile-nextjs && npm install && cd ..
```

### 2. **Run All Tests**
```bash
# Run backend tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run test:performance
```

### 3. **Start Development Servers**
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start Next.js frontend
cd lastmile-nextjs && npm run dev
```

## 🧪 **Backend Testing**

### **Available Test Suites**

#### Core Functionality Tests
- ✅ **Authentication** (`tests/auth.test.js`)
- ✅ **User Management** (`tests/user.test.js`)
- ✅ **Offer System** (`tests/offer.test.js`)
- ✅ **Payment Processing** (`tests/payment.test.js`)
- ✅ **Notifications** (`tests/notification.test.js`)

#### Advanced Features Tests
- ✅ **Geospatial Queries** (`tests/geospatial.test.js`)
- ✅ **Location Tracking** (`tests/location-tracking.test.js`)
- ✅ **Earnings Calculation** (`tests/earnings.test.js`)
- ✅ **Caching System** (`tests/caching.test.js`)
- ✅ **Admin Functions** (`tests/admin.test.js`)

#### Integration Tests
- ✅ **User Workflows** (`tests/integration/userWorkflows.test.js`)
- ✅ **Offer Workflows** (`tests/integration/offerWorkflows.test.js`)
- ✅ **Payment Workflows** (`tests/integration/paymentNotificationWorkflows.test.js`)

#### Performance Tests
- ✅ **Database Performance** (`tests/performance/databasePerformance.test.js`)

### **Test Commands**
```bash
# Run specific test file
npm test tests/auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Run tests with verbose output
npm test -- --verbose

# Run tests with coverage for specific files
npm test -- --collectCoverageFrom="models/**/*.js"
```

## 🌐 **Frontend Testing (Next.js)**

### **Development Server**
```bash
cd lastmile-nextjs
npm run dev
```

### **Build Testing**
```bash
cd lastmile-nextjs
npm run build
npm start
```

### **Type Checking**
```bash
cd lastmile-nextjs
npm run type-check
```

### **Linting**
```bash
cd lastmile-nextjs
npm run lint
```

## 🗄️ **Database Testing**

### **MongoDB Setup**
Tests use MongoDB Memory Server for isolated testing:

```bash
# Initialize test database
npm run db:init

# Run database performance tests
npm run test:performance
```

### **Redis Setup**
```bash
# Initialize Redis cache
npm run cache:init

# Test cache functionality
npm test tests/caching.test.js
```

## 🔧 **Environment Setup**

### **Backend Environment**
Create `.env` file in root:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/lastmile_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-test-jwt-secret
```

### **Frontend Environment**
Create `lastmile-nextjs/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/lastmile_nextjs
JWT_SECRET=your-test-jwt-secret
```

## 📊 **Test Coverage**

### **Current Coverage Targets**
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### **Generate Coverage Report**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🐛 **Debugging Tests**

### **Debug Individual Tests**
```bash
# Run single test with debugging
node --inspect-brk node_modules/.bin/jest tests/auth.test.js --runInBand

# Run with console output
npm test -- --verbose --no-coverage
```

### **Common Issues & Solutions**

#### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"

# Restart MongoDB service
sudo systemctl restart mongod
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Start Redis server
redis-server
```

#### Port Conflicts
```bash
# Check what's running on ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :3000

# Kill processes if needed
sudo kill -9 $(lsof -t -i:3001)
```

## 🚀 **API Testing**

### **Manual API Testing**
```bash
# Health check
curl http://localhost:3001/api/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### **Automated API Testing**
```bash
# Run endpoint tests
node test-endpoints.js

# Run registration tests
node test-registration.js

# Run dashboard tests
node test-dashboard.js
```

## 📱 **Frontend Testing**

### **Component Testing**
Visit these test pages in your browser:
- `http://localhost:3000/components` - UI Component showcase
- `http://localhost:3000/forms-test` - Form validation testing
- `http://localhost:3000/auth-test` - Authentication flow testing

### **User Flow Testing**
1. **Registration Flow**
   - Business: `http://localhost:3000/register?type=business`
   - Rider: `http://localhost:3000/register?type=rider`

2. **Authentication Flow**
   - Login: `http://localhost:3000/login`
   - Password Reset: `http://localhost:3000/forgot-password`

3. **Dashboard Testing**
   - Business: `http://localhost:3000/dashboard/business`
   - Rider: `http://localhost:3000/dashboard/rider`
   - Admin: `http://localhost:3000/dashboard/admin`

## 🔍 **Performance Testing**

### **Backend Performance**
```bash
# Run performance tests
npm run test:performance

# Monitor cache performance
npm run cache:monitor
```

### **Frontend Performance**
```bash
cd lastmile-nextjs
# Build and analyze bundle
npm run build
npm run start

# Check build output for optimization opportunities
```

## 📝 **Test Reports**

### **Generate Test Reports**
```bash
# HTML coverage report
npm run test:coverage
open coverage/lcov-report/index.html

# JSON test results
npm test -- --json --outputFile=test-results.json
```

## 🔄 **Continuous Testing**

### **Watch Mode**
```bash
# Watch backend tests
npm run test:watch

# Watch frontend changes
cd lastmile-nextjs && npm run dev
```

### **Pre-commit Testing**
```bash
# Run all tests before committing
npm test && cd lastmile-nextjs && npm run type-check && npm run lint
```

## 🆘 **Troubleshooting**

### **Common Test Failures**

1. **Database Connection Timeout**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Redis Connection Failed**
   - Start Redis server: `redis-server`
   - Check Redis URL in environment

3. **Port Already in Use**
   - Kill existing processes
   - Use different ports in environment

4. **JWT Token Issues**
   - Verify JWT_SECRET in environment
   - Check token expiration settings

### **Getting Help**
- Check `TESTING.md` for detailed testing documentation
- Review individual test files for specific test cases
- Use `npm test -- --help` for Jest options

---

**Happy Testing! 🎉**

Run `npm test` to get started with comprehensive testing of your LastMile Delivery Platform.
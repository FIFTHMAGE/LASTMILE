# 🚀 LastMile Delivery Platform - Simple Start (No External APIs)

## What You Need
- Node.js 18+
- MongoDB (we'll help you set this up)

## 🏃‍♂️ Super Quick Setup (3 steps)

### Step 1: Install Dependencies
```bash
cd lastmile-nextjs
npm install
```

### Step 2: Set Up MongoDB

#### Option A: Use MongoDB Atlas (Free Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a new cluster (choose the free M0 tier)
4. Create a database user
5. Get your connection string

#### Option B: Use Local MongoDB with Docker
```bash
docker run -d --name mongodb -p 27017:27017 mongo:latest
```
Your connection string will be: `mongodb://localhost:27017/lastmile-delivery`

### Step 3: Configure and Start
```bash
# Run the setup script
npm run setup

# Initialize the database
npm run setup:db

# Start the application
npm run dev
```

## 🎯 What Works Without External APIs

✅ **Core Features Available:**
- User registration and login (Business & Rider)
- Create and manage delivery offers
- Accept delivery offers
- Basic location handling (with mock coordinates)
- User dashboards
- Admin panel
- Notifications system
- Basic payment tracking (without actual processing)

## 🔐 Default Login Credentials

After running `npm run setup:db`, you can login with:

### Admin User
- **Email:** admin@lastmile.com
- **Password:** admin123

### Sample Business
- **Email:** business@example.com  
- **Password:** business123

### Sample Rider
- **Email:** rider@example.com
- **Password:** rider123

## 🌐 Access Your Application

Visit: http://localhost:3000

## 📱 What You'll See

1. **Landing Page** - Overview of the platform
2. **Registration** - Sign up as Business or Rider
3. **Business Dashboard** - Create and manage delivery offers
4. **Rider Dashboard** - View and accept available offers
5. **Admin Dashboard** - System overview and user management

## 🔧 Current Limitations (Can Add Later)

❌ **Disabled for Now:**
- Real-time GPS tracking (no Google Maps API)
- Actual payment processing (no Stripe)
- Email notifications (no email service configured)
- Real-time location updates

✅ **What Still Works:**
- All user interfaces and workflows
- Database operations
- Authentication and authorization
- Mock location data for testing
- Basic offer management

## 🚀 Next Steps (Optional)

When you're ready to add more features:

1. **Add Google Maps:**
   - Get API key from Google Cloud Console
   - Enable real-time location tracking

2. **Add Stripe Payments:**
   - Set up Stripe account
   - Enable actual payment processing

3. **Add Email Service:**
   - Configure SMTP settings
   - Enable email notifications

## 🆘 Troubleshooting

### MongoDB Connection Issues
- Make sure MongoDB is running
- Check your connection string in .env.local
- For Atlas: verify network access settings

### Port 3000 Already in Use
```bash
npx kill-port 3000
npm run dev
```

### Environment Issues
```bash
# Reset environment
npm run setup
```

## 🎉 You're Ready!

Your LastMile delivery platform is now running with core functionality. You can:
- Register users
- Create delivery offers  
- Accept offers
- Manage the platform

Add external APIs later when you're ready to enhance the features!
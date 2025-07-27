# 🚀 LastMile Delivery Platform - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas account)
- Git

## 🏃‍♂️ Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd lastmile-nextjs
npm install
```

### 2. Environment Setup
Run the interactive setup script:
```bash
npm run setup
```

This will guide you through configuring:
- MongoDB connection
- Email settings (optional)
- Stripe payment keys (optional)
- Google Maps API (optional)

### 3. Initialize Database
```bash
npm run setup:db
```

This will:
- Create necessary collections and indexes
- Set up an admin user (admin@lastmile.com / admin123)
- Create sample development data

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000 to see your application!

## 🔐 Default Login Credentials

### Admin User
- **Email:** admin@lastmile.com
- **Password:** admin123
- **Role:** Administrator

### Sample Business User
- **Email:** business@example.com
- **Password:** business123
- **Role:** Business Owner

### Sample Rider User
- **Email:** rider@example.com
- **Password:** rider123
- **Role:** Delivery Rider

⚠️ **Important:** Change these passwords in production!

## 🗄️ Database Options

### Option 1: Local MongoDB
```bash
# Install MongoDB locally or use Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### Option 2: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update MONGODB_URI in .env.local

## 🔧 Configuration

### Required Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXTAUTH_SECRET=your_nextauth_secret
```

### Optional Services
- **Stripe:** For payment processing
- **Google Maps:** For location services
- **Email:** For notifications
- **Redis:** For caching (performance)

## 📱 Features Available

✅ **User Management**
- Business and Rider registration
- Role-based authentication
- Profile management

✅ **Delivery System**
- Create delivery offers
- Location-based matching
- Real-time tracking

✅ **Payment Processing**
- Stripe integration
- Earnings tracking
- Payment history

✅ **Admin Dashboard**
- System monitoring
- User management
- Analytics

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run deploy
```

### Manual Deployment
1. Build the application: `npm run build`
2. Start production server: `npm start`

## 🆘 Troubleshooting

### Database Connection Issues
1. Check MongoDB is running
2. Verify connection string in .env.local
3. Check network access (for Atlas)

### Environment Variables
1. Copy .env.example to .env.local
2. Run `npm run setup` to configure
3. Restart development server

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
npm run dev
```

## 📚 Next Steps

1. **Customize Branding:** Update colors, logos, and text
2. **Configure Services:** Set up Stripe, Google Maps, Email
3. **Add Features:** Extend functionality as needed
4. **Deploy:** Push to production

## 🔗 Useful Links

- [MongoDB Setup Guide](./MONGODB_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Environment Documentation](./docs/ENVIRONMENT.md)
- [Project Structure](./docs/PROJECT_STRUCTURE.md)

## 💬 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the logs in the terminal
3. Ensure all environment variables are set correctly

Happy coding! 🎉
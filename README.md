# Last Mile Delivery Platform

A comprehensive delivery platform connecting businesses with nearby riders for efficient package delivery services.

## 🚀 Quick Deploy

### Deploy to Railway (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/lastmile-delivery-platform)

### Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Deploy to Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 🏗️ Manual Deployment

### Prerequisites
- Node.js 18+
- MongoDB database
- Redis (optional, for caching)

### Environment Variables
```bash
NODE_ENV=production
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
MONGODB_URI=your-mongodb-connection-string
REDIS_URL=your-redis-url (optional)
```

### Installation
```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
npm start
```

## 🧪 Testing

Visit your deployed URL to test:
- User registration (Business/Rider)
- Offer creation and management
- Real-time notifications
- Location-based matching

## 📱 Features

- **Role-based Authentication** (Business/Rider/Admin)
- **Geospatial Queries** for location-based matching
- **Real-time Notifications**
- **Payment Processing**
- **Delivery Tracking**
- **API Versioning** (V1 & V2)
- **Redis Caching** for performance
- **Responsive Design**

## 🔧 API Endpoints

- `GET /health` - API health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/offers` - Browse offers
- `POST /api/offers` - Create offer
- `GET /api/version` - API version info

## 🎯 Live Demo

Your application will be available at your Railway deployment URL.

## 📞 Support

For issues or questions, check the deployment logs in your Railway dashboard.
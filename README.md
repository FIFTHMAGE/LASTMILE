# Last Mile Backend

This is the backend API for Last Mile, a platform connecting businesses with nearby riders.

## Features
- User authentication (businesses & riders)
- Businesses can post delivery offers (location, amount, details)
- Riders can view and accept nearby offers
- Geospatial queries for location-based matching

## Tech Stack
- Node.js, Express.js
- MongoDB (with Mongoose)
- JWT authentication

## Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory with:
   ```env
   MONGO_URI=mongodb://localhost:27017/lastmile
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
3. Start MongoDB locally, then run:
   ```bash
   node server.js
   ```

## API Endpoints
### Auth
- `POST /api/auth/register` — Register as business or rider
- `POST /api/auth/login` — Login and get JWT

### Offers
- `POST /api/offers/` — (Business) Post a new offer
- `GET /api/offers/nearby?lng=...&lat=...` — (Rider) Get offers near location
- `POST /api/offers/:id/accept` — (Rider) Accept an offer
- `POST /api/offers/:id/complete` — (Business or Rider) Mark offer as completed

### Notifications
- `GET /api/notifications/` — Get all notifications for logged-in user
- `POST /api/notifications/:id/read` — Mark a notification as read "# LASTMILE" 

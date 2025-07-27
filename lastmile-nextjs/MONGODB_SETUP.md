# MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project called "LastMile Delivery"

### Step 2: Create a Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "lastmile-cluster")

### Step 3: Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `lastmile_user`
5. Generate a secure password (save it!)
6. Database User Privileges: "Read and write to any database"

### Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses

### Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `lastmile-delivery`

Example connection string:
```
mongodb+srv://lastmile_user:YOUR_PASSWORD@lastmile-cluster.xxxxx.mongodb.net/lastmile-delivery?retryWrites=true&w=majority
```

## Option 2: Local MongoDB Installation

### Windows Installation
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Install MongoDB as a Windows Service
4. MongoDB will be available at `mongodb://localhost:27017`

### Using Docker (Alternative)
```bash
# Pull MongoDB image
docker pull mongo:latest

# Run MongoDB container
docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest

# Connection string for Docker
mongodb://admin:password@localhost:27017/lastmile-delivery?authSource=admin
```

## Database Schema Setup

The application will automatically create the necessary collections and indexes when you first run it. The main collections will be:

- `users` - User accounts (businesses and riders)
- `offers` - Delivery offers
- `notifications` - User notifications
- `payments` - Payment transactions
- `delivery_tracking` - Real-time delivery tracking

## Environment Configuration

Update your `.env.local` file with the MongoDB connection string:

```env
# For MongoDB Atlas
MONGODB_URI=mongodb+srv://lastmile_user:YOUR_PASSWORD@lastmile-cluster.xxxxx.mongodb.net/lastmile-delivery?retryWrites=true&w=majority

# For Local MongoDB
MONGODB_URI=mongodb://localhost:27017/lastmile-delivery

# For Docker MongoDB
MONGODB_URI=mongodb://admin:password@localhost:27017/lastmile-delivery?authSource=admin
```

## Testing the Connection

After setting up MongoDB, you can test the connection by running:

```bash
cd lastmile-nextjs
npm run dev
```

Check the console for database connection messages.
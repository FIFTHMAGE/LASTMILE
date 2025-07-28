#!/bin/bash

echo "🚀 Setting up Vercel environment variables..."
echo "============================================="
echo ""

echo "📝 This will add the required environment variables to your Vercel project"
echo "Make sure you have Vercel CLI installed: npm i -g vercel"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "🔧 Adding MONGODB_URI..."
echo "mongodb+srv://olakumaps:JdE3fCzP1ZexSeHr@cluster0.qpnev0l.mongodb.net/lastmile-delivery?retryWrites=true&w=majority&appName=Cluster0" | vercel env add MONGODB_URI production

echo ""
echo "🔧 Adding JWT_SECRET..."
echo "f17491dc9936725de57680174e1c705ed31cfb831ab609f7dc5718404baa16ac" | vercel env add JWT_SECRET production

echo ""
echo "🔧 Adding NEXTAUTH_SECRET..."
echo "99d9d31527cdbf9f6ad3379fd370204b70d3df2016098fe2022bbf60810ef0cd" | vercel env add NEXTAUTH_SECRET production

echo ""
echo "🌐 Adding NEXTAUTH_URL..."
echo "⚠️  You need to replace 'your-project-name' with your actual Vercel project name"
read -p "Enter your Vercel project URL (e.g., https://my-app.vercel.app): " NEXTAUTH_URL
echo "$NEXTAUTH_URL" | vercel env add NEXTAUTH_URL production

echo ""
echo "✅ Environment variables setup complete!"
echo "🚀 Now run: npm run deploy:vercel"
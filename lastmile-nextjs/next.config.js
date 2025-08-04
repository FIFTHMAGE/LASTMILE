/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app'],
    },
  },

  // Image optimization
  images: {
    domains: ['localhost', 'vercel.app'],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/business',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'user-role',
            value: 'business',
          },
        ],
      },
      {
        source: '/dashboard',
        destination: '/dashboard/rider',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'user-role',
            value: 'rider',
          },
        ],
      },
      {
        source: '/dashboard',
        destination: '/dashboard/admin',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'user-role',
            value: 'admin',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add path alias configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    return config;
  },

  // SWC minification is enabled by default in Next.js 15
};

module.exports = nextConfig;
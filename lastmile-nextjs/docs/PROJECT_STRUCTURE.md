# Project Structure

This document describes the directory structure of the LastMile Delivery Platform Next.js application.

## Root Directory Structure

```
lastmile-nextjs/
├── src/                    # Source code directory
├── public/                 # Static assets
├── docs/                   # Documentation
├── .env.local             # Environment variables (not in git)
├── .env.example           # Environment variables template
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Source Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Authentication pages (route group)
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify-email/
│   │   └── resend-verification/
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── business/      # Business user pages
│   │   ├── rider/         # Rider user pages
│   │   └── admin/         # Admin user pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── offers/        # Offer management endpoints
│   │   ├── payments/      # Payment processing endpoints
│   │   ├── notifications/ # Notification endpoints
│   │   └── user/          # User management endpoints
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   ├── not-found.tsx      # 404 page
│   └── error.tsx          # Error page
├── components/            # Reusable React components
│   ├── ui/                # Basic UI components
│   ├── layout/            # Layout components
│   ├── forms/             # Form components
│   └── features/          # Feature-specific components
│       ├── auth/          # Authentication components
│       ├── offers/        # Offer-related components
│       └── dashboard/     # Dashboard components
├── lib/                   # Utility libraries and configurations
│   ├── types/             # TypeScript type definitions
│   ├── models/            # Database models
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
├── contexts/              # React context providers
├── hooks/                 # Custom React hooks
└── middleware.ts          # Next.js middleware
```

## Key Directories Explained

### `/src/app/`
Contains all pages and API routes using Next.js App Router:
- `(auth)/` - Route group for authentication pages (doesn't affect URL structure)
- `dashboard/` - Protected pages for authenticated users
- `api/` - Server-side API endpoints

### `/src/components/`
Reusable React components organized by purpose:
- `ui/` - Basic UI components (Button, Input, Card, etc.)
- `layout/` - Layout components (Header, Sidebar, etc.)
- `forms/` - Form components with validation
- `features/` - Feature-specific components

### `/src/lib/`
Core application logic and utilities:
- `types/` - TypeScript interfaces and type definitions
- `models/` - Database models and schemas
- `services/` - Business logic and external service integrations
- `utils/` - Helper functions and utilities
- `config/` - Application configuration

### `/src/contexts/`
React context providers for global state management

### `/src/hooks/`
Custom React hooks for reusable logic

## File Naming Conventions

- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx` (Next.js App Router convention)
- **API Routes**: `route.ts` (Next.js App Router convention)
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase with descriptive names (e.g., `UserTypes.ts`)

## Import Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of: import { User } from '../../../lib/types/user'
import { User } from '@/lib/types/user'

// Available aliases:
// @/* -> src/*
```

## Route Structure

### Public Routes
- `/` - Home page
- `/login` - User login
- `/register` - User registration
- `/verify-email` - Email verification

### Protected Routes
- `/dashboard/business/*` - Business user dashboard
- `/dashboard/rider/*` - Rider user dashboard
- `/dashboard/admin/*` - Admin user dashboard

### API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/offers/*` - Offer management
- `/api/payments/*` - Payment processing
- `/api/notifications/*` - Notifications
- `/api/user/*` - User management

This structure follows Next.js 14 App Router conventions and provides clear separation of concerns for maintainable code.
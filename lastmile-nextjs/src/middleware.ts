import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for authentication and route protection
 * This runs before every request to protected routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/verify-email')
  ) {
    return NextResponse.next();
  }

  // Check for authentication token in API routes
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }

    // TODO: Verify JWT token here
    // For now, we'll add user info to headers for API routes
    const token = authHeader.substring(7);
    
    try {
      // JWT verification will be implemented in the JWT utilities
      // const payload = verifyToken(token);
      
      // Add user info to request headers for API routes
      const requestHeaders = new Headers(request.headers);
      // requestHeaders.set('x-user-id', payload.id);
      // requestHeaders.set('x-user-role', payload.role);
      // requestHeaders.set('x-user-verified', payload.isVerified.toString());
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            message: 'Invalid authentication token',
            code: 'INVALID_TOKEN',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }
  }

  // Route protection for dashboard pages
  if (pathname.startsWith('/dashboard')) {
    // Check for authentication cookie or session
    // This will be handled by the auth context on the client side
    // For now, we'll let the client-side auth handle redirects
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*'
  ]
};
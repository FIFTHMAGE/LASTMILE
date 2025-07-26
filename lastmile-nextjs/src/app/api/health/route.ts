/**
 * Health check API route
 * GET /api/health - System health check
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { createHealthCheckResponse } from '@/lib/utils/api-response';

/**
 * GET handler - System health check
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, 'healthy' | 'unhealthy'> = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Database connectivity check
  try {
    await connectDB();
    checks.database = 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    checks.database = 'unhealthy';
    overallStatus = 'unhealthy';
  }

  // Memory usage check
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    // Consider unhealthy if using more than 1GB
    if (memoryUsageMB > 1024) {
      checks.memory = 'unhealthy';
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.memory = 'healthy';
    }
  } catch (error) {
    console.error('Memory health check failed:', error);
    checks.memory = 'unhealthy';
    overallStatus = 'unhealthy';
  }

  // Response time check
  const responseTime = Date.now() - startTime;
  if (responseTime > 5000) { // 5 seconds
    checks.responseTime = 'unhealthy';
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  } else {
    checks.responseTime = 'healthy';
  }

  // Environment variables check
  try {
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'NEXTAUTH_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      checks.environment = 'unhealthy';
      overallStatus = 'unhealthy';
    } else {
      checks.environment = 'healthy';
    }
  } catch (error) {
    console.error('Environment health check failed:', error);
    checks.environment = 'unhealthy';
    overallStatus = 'unhealthy';
  }

  // System uptime
  const uptime = process.uptime();

  // Version info
  const version = process.env.npm_package_version || '1.0.0';

  return createHealthCheckResponse(
    overallStatus,
    checks,
    uptime,
    version
  );
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
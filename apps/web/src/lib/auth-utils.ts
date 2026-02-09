import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  type RateLimitType,
  type RateLimitResult,
} from '@/lib/rate-limit';

export interface AuthResult {
  success: true;
  userId: string;
  rateLimitResult: RateLimitResult;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

/**
 * Verify Firebase auth token and apply rate limiting for authenticated routes.
 * Combines authentication and rate limiting in a single function.
 *
 * @param request - The incoming request
 * @param type - The rate limit category to apply
 * @returns AuthResult on success, or AuthError with response on failure
 */
export async function verifyAuthWithRateLimit(
  request: NextRequest,
  type: RateLimitType
): Promise<AuthResult | AuthError> {
  // Initialize Firebase Admin (lazy)
  initAdmin();

  // Get auth token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Verify Firebase token
  let userId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    userId = decodedToken.uid;
  } catch (authError) {
    console.error('Auth token verification failed:', authError);
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Check rate limit (fail-open: allow request if rate limiter is unavailable)
  let rateLimitResult: RateLimitResult = { success: true, limit: 0, remaining: 0, reset: 0 };
  try {
    rateLimitResult = await checkRateLimit(`user:${userId}`, type);

    if (!rateLimitResult.success) {
      return {
        success: false,
        response: rateLimitExceededResponse(rateLimitResult),
      };
    }
  } catch (rateLimitError) {
    console.error('Rate limit check failed (allowing request):', rateLimitError);
    // Fail-open: allow the request through if rate limiting is unavailable
  }

  return {
    success: true,
    userId,
    rateLimitResult,
  };
}

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection info (may not be available in all environments)
  return '127.0.0.1';
}

export interface IpRateLimitResult {
  success: true;
  rateLimitResult: RateLimitResult;
}

export interface IpRateLimitError {
  success: false;
  response: NextResponse;
}

/**
 * Apply IP-based rate limiting for public routes (like thumbnails).
 *
 * @param request - The incoming request
 * @param type - The rate limit category to apply
 * @returns IpRateLimitResult on success, or IpRateLimitError with response on failure
 */
export async function checkIpRateLimit(
  request: NextRequest,
  type: RateLimitType
): Promise<IpRateLimitResult | IpRateLimitError> {
  const ip = getClientIp(request);

  // Check rate limit using IP as identifier
  const rateLimitResult = await checkRateLimit(`ip:${ip}`, type);

  if (!rateLimitResult.success) {
    return {
      success: false,
      response: rateLimitExceededResponse(rateLimitResult),
    };
  }

  return {
    success: true,
    rateLimitResult,
  };
}

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMITS } from '@myphoto/shared';
import { NextResponse } from 'next/server';

// Lazy initialization of Redis client
let redis: Redis | null = null;
let _rateLimiters: RateLimiters | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

interface RateLimiters {
  upload: Ratelimit;
  download: Ratelimit;
  search: Ratelimit;
  api: Ratelimit;
}

function getRateLimiters(): RateLimiters {
  if (!_rateLimiters) {
    const r = getRedis();
    _rateLimiters = {
      upload: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.upload, '1 m'),
        prefix: 'ratelimit:upload',
      }),
      download: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.download, '1 m'),
        prefix: 'ratelimit:download',
      }),
      search: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.search, '1 m'),
        prefix: 'ratelimit:search',
      }),
      api: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.api, '1 m'),
        prefix: 'ratelimit:api',
      }),
    };
  }
  return _rateLimiters;
}

export type RateLimitType = 'upload' | 'download' | 'search' | 'api';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier and type
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();
  const limiter = limiters[type];
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}

/**
 * Create a 429 Too Many Requests response with appropriate headers
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  return response;
}

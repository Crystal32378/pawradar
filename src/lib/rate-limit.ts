/**
 * Simple in-memory rate limiter for Vercel serverless.
 *
 * Production note: in-memory state is per-instance and resets on cold
 * start. For true rate limiting use Upstash Redis + @upstash/ratelimit
 * (free tier covers ~10K requests/month). This implementation is a
 * pragmatic Phase 1 stopgap that handles single-instance bursts and
 * signals intent — it does not defend against distributed attacks.
 *
 * Replace via `RATELIMIT_REDIS_URL` env var before launch.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** How many requests are allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = {
      count: 1,
      resetAt: now + opts.windowMs,
    };
    buckets.set(key, fresh);
    return { allowed: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: opts.limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Extract a stable client key from a Request.
 * Prefers x-forwarded-for (Vercel sets this) and falls back to a
 * fixed string for local dev.
 */
export function clientKey(request: Request, salt: string = ''): string {
  const xff = request.headers.get('x-forwarded-for');
  const ip = xff?.split(',')[0]?.trim();
  if (ip && ip.length > 0) return `${salt}:${ip}`;
  return `${salt}:local`;
}

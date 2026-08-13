import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function secret(): string {
  const value = process.env.RATE_LIMIT_SECRET ?? process.env.SESSION_SECRET;
  if (!value) throw new Error('RATE_LIMIT_SECRET or SESSION_SECRET is required');
  return value;
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function opaqueRateLimitKey(...parts: string[]): string {
  return createHmac('sha256', secret())
    .update(parts.join('\u0000'))
    .digest('base64url');
}

/** Durable, database-backed fixed window with one atomic PostgreSQL upsert. */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + options.windowMs);

  const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>(
    Prisma.sql`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count", "resetAt"
    `,
  );
  const bucket = rows[0];
  if (!bucket) throw new Error('Rate limit bucket update failed');
  return {
    allowed: bucket.count <= options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function retryAfterSeconds(resetAt: Date): string {
  return String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)));
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryRaw = vi.fn();
vi.mock('../db', () => ({ db: { $queryRaw: queryRaw } }));

describe('durable rate limit', () => {
  beforeEach(() => {
    vi.resetModules();
    queryRaw.mockReset();
    process.env.RATE_LIMIT_SECRET = 'test-secret-that-is-long-enough-for-tests';
  });

  it('uses the returned atomic database count', async () => {
    queryRaw.mockResolvedValue([{ count: 2, resetAt: new Date(Date.now() + 1000) }]);
    const { rateLimit } = await import('../rate-limit');
    await expect(rateLimit('opaque-key', { limit: 3, windowMs: 1000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it('blocks when the database count exceeds the limit', async () => {
    queryRaw.mockResolvedValue([{ count: 4, resetAt: new Date(Date.now() + 1000) }]);
    const { rateLimit } = await import('../rate-limit');
    await expect(rateLimit('opaque-key', { limit: 3, windowMs: 1000 })).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('extracts the first forwarded IP and hashes identifying values', async () => {
    const { opaqueRateLimitKey, requestIp } = await import('../rate-limit');
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(requestIp(request)).toBe('1.2.3.4');
    expect(opaqueRateLimitKey('login', 'person@example.com')).not.toContain('person@example.com');
  });
});

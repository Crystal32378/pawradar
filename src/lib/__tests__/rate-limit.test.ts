import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, clientKey } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Buckets are in module-level state — clear by setting all to expired
    // (not perfect, but Vitest isolates modules per test file by default).
  });

  it('allows first request', () => {
    const result = rateLimit('test:first', { limit: 5, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('counts down remaining within window', () => {
    const key = 'test:count';
    rateLimit(key, { limit: 3, windowMs: 1000 });
    rateLimit(key, { limit: 3, windowMs: 1000 });
    const result = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks requests beyond the limit', () => {
    const key = 'test:block';
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 1000 });
    }
    const result = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the window passes', () => {
    const key = 'test:reset';
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 1 });
    }
    // Wait 5ms so window definitely expires
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = rateLimit(key, { limit: 3, windowMs: 1 });
        expect(result.allowed).toBe(true);
        resolve();
      }, 5);
    });
  });
});

describe('clientKey', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(clientKey(req, 'salt')).toBe('salt:1.2.3.4');
  });

  it('falls back to local when no xff header', () => {
    const req = new Request('https://example.com');
    expect(clientKey(req, 'salt')).toBe('salt:local');
  });

  it('uses provided salt prefix', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });
    expect(clientKey(req, 'track:meet_x')).toBe('track:meet_x:9.9.9.9');
  });
});

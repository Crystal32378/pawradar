import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signInWithCredentials } from '@/lib/auth-server';
import { opaqueRateLimitKey, rateLimit, requestIp, retryAfterSeconds } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

/**
 * POST /api/auth/login
 * Credentials → sets session cookie. Returns the user.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入內容有誤' }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const limit = await rateLimit(
    opaqueRateLimitKey('login', requestIp(request), normalizedEmail),
    { limit: 8, windowMs: 15 * 60_000 },
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: '登入嘗試過多，請稍後再試' },
      { status: 429, headers: { 'Retry-After': retryAfterSeconds(limit.resetAt) } },
    );
  }

  const user = await signInWithCredentials(normalizedEmail, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: 'Email 或密碼錯誤' }, { status: 401 });
  }
  return NextResponse.json({ user });
}

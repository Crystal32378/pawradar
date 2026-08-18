import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { opaqueRateLimitKey, rateLimit, requestIp, retryAfterSeconds } from '@/lib/rate-limit';

const signupSchema = z.object({
  email: z.string().email('請輸入有效 email').max(120),
  password: z
    .string()
    .min(8, '密碼至少 8 字元')
    .max(72, '密碼過長（最多 72 字元）')
    .refine((v) => /[a-z]/.test(v) && /[0-9]/.test(v), '密碼需含英文字母與數字'),
  name: z.string().trim().min(1, '請輸入創作者名稱').max(60).optional(),
  igHandle: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v && v.length > 0 ? (v.startsWith('@') ? v : `@${v}`) : undefined)),
});

/**
 * POST /api/auth/signup
 * Creates a creator account. Public endpoint (signup is itself anonymous),
 * but rate-limited at the edge in production.
 *
 * After signup, the client should call NextAuth's signIn('credentials', ...)
 * to establish a session.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: '請求格式錯誤：需要 JSON 內容' },
      { status: 400 },
    );
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '輸入內容有誤',
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { email, password, name, igHandle } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const limit = await rateLimit(
    opaqueRateLimitKey('signup', requestIp(request), normalizedEmail),
    { limit: 4, windowMs: 60 * 60_000 },
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: '建立帳號嘗試過多，請稍後再試' },
      { status: 429, headers: { 'Retry-After': retryAfterSeconds(limit.resetAt) } },
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await db.user.create({
      data: { email: normalizedEmail, password: hashed, name, igHandle },
      select: { id: true, email: true, name: true, igHandle: true },
    });
  } catch {
    // Deliberately generic: do not reveal whether the account already exists.
    return NextResponse.json(
      { error: '無法建立帳號，請確認資料或改用登入' },
      { status: 400 },
    );
  }

  return NextResponse.json({ user }, { status: 201 });
}

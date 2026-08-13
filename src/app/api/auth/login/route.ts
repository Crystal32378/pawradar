import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signInWithCredentials } from '@/lib/auth-server';

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

  const user = await signInWithCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: 'Email 或密碼錯誤' }, { status: 401 });
  }
  return NextResponse.json({ user });
}

import { cookies } from 'next/headers';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

/**
 * Lightweight cookie-based session.
 *
 * Why not NextAuth v4? v4 has runtime 400s on Next.js 16 App Router
 * (auth route GET handling). Rather than fighting that, we implement
 * a minimal HMAC-signed cookie session with the same security model:
 *   - Cookie contains userId + HMAC signature
 *   - Server validates signature on every request
 *   - Passwords are bcrypt-hashed in DB
 *   - Cookie is httpOnly + SameSite=Lax + Secure in production
 *
 * This is enough for Phase 1 creator accounts. When we need OAuth or
 * more advanced features, we can revisit NextAuth v5 (Auth.js) or
 * another library.
 *
 * Cookie format: `<userId>.<base64url-hmac>`
 */

const SESSION_COOKIE = 'pawradar_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production');
    }
    return 'dev-only-secret-not-for-production';
  }
  return secret;
}

function sign(payload: string): string {
  const secret = getSecret();
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Read session from cookies. Returns null if not authenticated.
 */
export async function getCreatorSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  const userId = verify(cookie.value);
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  return user;
}

/**
 * Returns the session or a 401 Response. Use in API routes that need auth.
 *
 * Usage:
 *   const [session, response] = await requireCreatorSession();
 *   if (response) return response;
 */
export async function requireCreatorSession(): Promise<
  [SessionUser, null] | [null, Response]
> {
  const session = await getCreatorSession();
  if (!session) {
    return [
      null,
      new Response(JSON.stringify({ error: '未登入，請先建立創作者帳號' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ];
  }
  return [session, null];
}

/**
 * Verify the creator owns the given event slug.
 */
export async function requireEventOwnership(slug: string) {
  const [session, authResponse] = await requireCreatorSession();
  if (authResponse) return [null, authResponse] as const;

  const event = await db.event.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!event) {
    return [
      null,
      new Response(JSON.stringify({ error: '找不到這個散步事件' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    ] as const;
  }
  if (event.ownerId !== session!.id) {
    return [
      null,
      new Response(JSON.stringify({ error: '你沒有權限管理這個事件' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    ] as const;
  }
  return [event, null] as const;
}

/**
 * Sign in with credentials. Sets the session cookie on success.
 * Returns the user or null on bad credentials.
 */
export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, password: true },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  const token = sign(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * Sign out: delete the session cookie.
 */
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

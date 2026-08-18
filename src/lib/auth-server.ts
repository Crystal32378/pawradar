import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'pawradar_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

interface SessionClaims {
  sub: string;
  exp: number;
  version: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

function sessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }
  return value;
}

function signature(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function encodeClaims(claims: SessionClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

function decodeClaims(token: string): SessionClaims | null {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const actual = token.slice(dot + 1);
  const expected = signature(payload);
  try {
    if (actual.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SessionClaims>;
    if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number' || typeof parsed.version !== 'number') return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed as SessionClaims;
  } catch {
    return null;
  }
}

export async function getCreatorSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = decodeClaims(token);
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== claims.version) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireCreatorSession(): Promise<
  [SessionUser, null] | [null, NextResponse]
> {
  const session = await getCreatorSession();
  if (!session) {
    return [null, NextResponse.json({ error: '未登入，請先建立創作者帳號' }, { status: 401 })];
  }
  return [session, null];
}

export async function requireEventOwnership(slug: string) {
  const [session, authResponse] = await requireCreatorSession();
  if (authResponse) return [null, authResponse] as const;
  const event = await db.event.findUnique({
    where: { slug },
    select: { id: true, slug: true, ownerId: true, status: true },
  });
  if (!event) return [null, NextResponse.json({ error: '找不到這個散步事件' }, { status: 404 })] as const;
  if (event.ownerId !== session.id) {
    return [null, NextResponse.json({ error: '你沒有權限管理這個事件' }, { status: 403 })] as const;
  }
  return [event, null] as const;
}

export function validateMutationOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return NextResponse.json({ error: '缺少 Origin header' }, { status: 403 });
  const expectedOrigin = new URL(request.url).origin;
  if (origin !== expectedOrigin) return NextResponse.json({ error: '不允許跨站請求' }, { status: 403 });
  return null;
}

export async function signInWithCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, password: true, sessionVersion: true },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) return null;

  const now = Math.floor(Date.now() / 1000);
  const token = encodeClaims({ sub: user.id, exp: now + SESSION_TTL_SECONDS, version: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return { id: user.id, email: user.email, name: user.name };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

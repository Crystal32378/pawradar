import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth-server';

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}

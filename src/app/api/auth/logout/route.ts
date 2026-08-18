import { NextResponse } from 'next/server';
import { signOut, validateMutationOrigin } from '@/lib/auth-server';

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  await signOut();
  return NextResponse.json({ ok: true });
}

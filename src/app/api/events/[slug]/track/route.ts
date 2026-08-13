import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/events/[slug]/track
 * Increments the addCount KPI when a fan adds the event to their calendar.
 *
 * Phase 1 change: added rate limiting (10 increments per IP per minute)
 * to prevent KPI inflation. The ICS endpoint (/api/ics/[slug]) also
 * bumps this counter, so an attacker who downloads .ics repeatedly
 * can still inflate the count — full defense requires a more robust
 * tracking layer (Phase 4: server-side cookie or session).
 *
 * Public endpoint — fans are anonymous by design.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  // Rate limit per IP+slug: 10 increments per minute.
  const rl = rateLimit(clientKey(request, `track:${slug}`), {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: '請稍後再試', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const existing = await db.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: '找不到這個散步事件' },
      { status: 404 },
    );
  }
  const updated = await db.event.update({
    where: { slug },
    data: { addCount: { increment: 1 } },
    select: { addCount: true },
  });
  return NextResponse.json({ addCount: updated.addCount });
}

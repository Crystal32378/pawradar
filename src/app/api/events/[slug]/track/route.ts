import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { opaqueRateLimitKey, rateLimit, requestIp, retryAfterSeconds } from '@/lib/rate-limit';

interface RouteContext { params: Promise<{ slug: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const limit = await rateLimit(
    opaqueRateLimitKey('track', slug, requestIp(request)),
    { limit: 10, windowMs: 60_000 },
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: '請稍後再試' },
      { status: 429, headers: { 'Retry-After': retryAfterSeconds(limit.resetAt) } },
    );
  }
  const event = await db.event.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!event) return NextResponse.json({ error: '找不到這個散步事件' }, { status: 404 });
  if (event.status === 'cancelled') return NextResponse.json({ error: '活動已取消' }, { status: 409 });
  const updated = await db.event.update({
    where: { id: event.id },
    data: { addCount: { increment: 1 } },
    select: { addCount: true },
  });
  return NextResponse.json({ addCount: updated.addCount });
}

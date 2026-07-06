import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/events/[slug]/track
 * Increments the addCount KPI when a fan adds the event to their calendar.
 * This is the only metric that matters in Phase 1.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
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

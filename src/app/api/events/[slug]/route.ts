import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/events/[slug]
 * Public endpoint used by the fan view to render the calendar invite card.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      slug: true,
      petName: true,
      ownerHandle: true,
      walkStart: true,
      walkEnd: true,
      location: true,
      notes: true,
      addCount: true,
      createdAt: true,
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: '找不到這個散步事件' },
      { status: 404 },
    );
  }
  return NextResponse.json({ event });
}

/**
 * DELETE /api/events/[slug]
 * Remove an event from the dashboard. Used by the KOL dashboard only —
 * in a real deployment this would be gated by auth.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
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
  await db.event.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}

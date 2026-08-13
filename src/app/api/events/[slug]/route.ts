import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/events/[slug]
 * Public endpoint used by the fan view to render the calendar invite card.
 *
 * Phase 1 change: this endpoint is still public, but only returns fan-safe
 * fields. It does NOT include addCount, createdAt, ownerId — those are
 * creator-only fields exposed via /api/dashboard/events.
 *
 * Fan-safe fields:
 *   - petName, ownerHandle, walkStart, walkEnd, location, notes, slug
 * Unsafe (creator-only):
 *   - addCount, createdAt, ownerId
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

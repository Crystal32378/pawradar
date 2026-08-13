import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEventOwnership } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * DELETE /api/dashboard/events/[slug]
 * Delete an event owned by the authenticated creator.
 *
 * Replaces the old public `DELETE /api/events/[slug]` which allowed
 * anyone who knew the slug to delete it (P0-1 in audit).
 *
 * Side effect: cascades to Subscription rows (Prisma onDelete: Cascade)
 * so opt-in subscribers are cleaned up automatically.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const [event, response] = await requireEventOwnership(slug);
  if (response) return response;

  await db.event.delete({ where: { id: event!.id } });
  return NextResponse.json({ ok: true });
}

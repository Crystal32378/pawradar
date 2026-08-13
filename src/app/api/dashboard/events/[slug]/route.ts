import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEventOwnership, validateMutationOrigin } from '@/lib/auth-server';
import { updateEventSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const { slug } = await params;
  const [ownedEvent, response] = await requireEventOwnership(slug);
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '輸入內容有誤', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const current = await db.event.findUniqueOrThrow({
    where: { id: ownedEvent!.id },
    select: { walkStart: true, walkEnd: true },
  });
  const currentDurationMs = current.walkEnd.getTime() - current.walkStart.getTime();
  const walkStart = input.walkStart ? new Date(input.walkStart) : current.walkStart;
  if (Number.isNaN(walkStart.getTime())) {
    return NextResponse.json({ error: '散步開始時間格式錯誤' }, { status: 400 });
  }
  const durationMs = input.durationMinutes
    ? input.durationMinutes * 60_000
    : currentDurationMs;

  const event = await db.event.update({
    where: { id: ownedEvent!.id },
    data: {
      petName: input.petName,
      ownerHandle: input.ownerHandle
        ? input.ownerHandle.startsWith('@')
          ? input.ownerHandle
          : `@${input.ownerHandle}`
        : undefined,
      walkStart: input.walkStart ? walkStart : undefined,
      walkEnd:
        input.walkStart || input.durationMinutes
          ? new Date(walkStart.getTime() + durationMs)
          : undefined,
      location: input.location,
      notes:
        input.notes === undefined
          ? undefined
          : input.notes.trim().length > 0
            ? input.notes.trim()
            : null,
      status: input.status,
    },
    select: {
      slug: true,
      petName: true,
      ownerHandle: true,
      walkStart: true,
      walkEnd: true,
      location: true,
      notes: true,
      status: true,
      addCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ event });
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
export async function DELETE(request: Request, { params }: RouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const { slug } = await params;
  const [event, response] = await requireEventOwnership(slug);
  if (response) return response;

  await db.event.delete({ where: { id: event!.id } });
  return NextResponse.json({ ok: true });
}

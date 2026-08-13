import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateUniqueSlug } from '@/lib/slug';
import { createEventSchema } from '@/lib/validations';
import { requireCreatorSession, validateMutationOrigin } from '@/lib/auth-server';

/**
 * GET /api/dashboard/events
 * List the authenticated creator's own events, newest first.
 *
 * Replaces the old public `GET /api/events` which leaked every event
 * to anonymous visitors (P0-2 in audit).
 */
export async function GET() {
  const [session, authResponse] = await requireCreatorSession();
  if (authResponse) return authResponse;

  const events = await db.event.findMany({
    where: { ownerId: session!.id },
    orderBy: { createdAt: 'desc' },
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
  return NextResponse.json({ events });
}

/**
 * POST /api/dashboard/events
 * Create a new walk event owned by the authenticated creator.
 *
 * Replaces the old public `POST /api/events` which allowed anonymous
 * creation with no ownership verification (P0-3 in audit).
 *
 * Future Phase 4: RevenueCat entitlement check goes here — verify
 * the creator is allowed to create more events based on plan limits.
 */
export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const [session, authResponse] = await requireCreatorSession();
  if (authResponse) return authResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: '請求格式錯誤：需要 JSON 內容' },
      { status: 400 },
    );
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '輸入內容有誤',
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { petName, ownerHandle, walkStart, durationMinutes, location, notes } =
    parsed.data;

  const start = new Date(walkStart);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      { error: '散步開始時間格式錯誤' },
      { status: 400 },
    );
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const slug = await generateUniqueSlug(petName);

  const event = await db.event.create({
    data: {
      slug,
      petName,
      ownerHandle: ownerHandle.startsWith('@')
        ? ownerHandle
        : `@${ownerHandle}`,
      walkStart: start,
      walkEnd: end,
      location,
      notes: notes && notes.trim().length > 0 ? notes.trim() : null,
      ownerId: session!.id,
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

  return NextResponse.json({ event }, { status: 201 });
}

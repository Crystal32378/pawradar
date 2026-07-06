import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateUniqueSlug } from '@/lib/slug';
import { createEventSchema } from '@/lib/validations';

/**
 * GET /api/events
 * List all events, newest first. Used by the KOL dashboard.
 */
export async function GET() {
  const events = await db.event.findMany({
    orderBy: { createdAt: 'desc' },
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
  return NextResponse.json({ events });
}

/**
 * POST /api/events
 * Create a new walk event. Returns the freshly created event including
 * the shareable slug.
 */
export async function POST(request: Request) {
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
    },
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

  return NextResponse.json({ event }, { status: 201 });
}

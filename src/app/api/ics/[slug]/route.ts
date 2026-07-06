import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateIcs, icsFilename } from '@/lib/ics';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/ics/[slug]
 * Returns a dynamically generated .ics calendar file for the event.
 * iOS/Android calendars will recognise this and prompt the user to add it.
 *
 * Because this is the golden path of the entire product, we deliberately
 * do NOT require the fan to register or click through any UI — the link
 * itself can be shared directly and will trigger a native calendar prompt.
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

  const ics = generateIcs(event);
  const filename = icsFilename(event.slug);

  // Bump the KPI counter (best-effort; we don't block the download on it).
  void db.event
    .update({
      where: { slug },
      data: { addCount: { increment: 1 } },
      select: { addCount: true },
    })
    .catch(() => {
      // Swallow — KPI tracking must never break the calendar download.
    });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

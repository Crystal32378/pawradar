import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteContext { params: Promise<{ slug: string }> }

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
      status: true,
    },
  });
  if (!event) return NextResponse.json({ error: '找不到這個散步事件' }, { status: 404 });
  return NextResponse.json({ event });
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This creator endpoint moved to /api/dashboard/events/[slug].' },
    { status: 410 },
  );
}

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This creator endpoint moved to /api/dashboard/events.' },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}

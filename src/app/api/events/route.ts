import { NextResponse } from 'next/server';

/**
 * /api/events (root)
 *
 * Phase 1 deprecation: this endpoint previously exposed
 *   GET  → list ALL events (P0-2 leak)
 *   POST → anonymous event creation (P0-3)
 *
 * Both moved to /api/dashboard/events with auth + ownership.
 * This stub returns 410 Gone with a pointer to the new location
 * so existing clients get a clear migration signal rather than 404.
 *
 * Safe to delete entirely once we're sure no client uses the old path.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated.',
      migrate: {
        list: 'GET /api/dashboard/events (auth required)',
        create: 'POST /api/dashboard/events (auth required)',
      },
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}

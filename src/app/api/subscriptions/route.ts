import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isOnesignalEnabled } from '@/lib/onesignal-config';
import { rateLimit, clientKey } from '@/lib/rate-limit';

const subscribeSchema = z.object({
  playerId: z.string().min(10, '無效的 playerId').max(200),
  eventSlug: z.string().min(1).max(120),
});

/**
 * POST /api/subscriptions
 *
 * Fan opt-in endpoint. Called after a fan taps "Notify me about changes"
 * in the post-ICS opt-in dialog. Records a Subscription row linking
 * their OneSignal playerId to the event.
 *
 * Public endpoint (fans are anonymous by design). Rate-limited to
 * prevent abuse.
 *
 * Lifecycle on subscribe:
 *   - If (playerId, eventSlug) already exists with state="active": noop
 *   - If exists with state="revoked": re-activate
 *   - If not exists: create new with state="active"
 */
export async function POST(request: Request) {
  // Hard gate: if feature flag off, return 501 so client UI degrades gracefully
  if (!isOnesignalEnabled) {
    return NextResponse.json(
      { error: '通知功能未啟用', reason: 'feature_disabled' },
      { status: 501 },
    );
  }

  // Rate limit: 10 subscribes per IP per minute
  const rl = rateLimit(clientKey(request, 'subscribe'), {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: '請稍後再試' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '輸入內容有誤', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { playerId, eventSlug } = parsed.data;

  // Verify the event exists (prevent subscribing to phantom slugs)
  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: '找不到這個散步事件' }, { status: 404 });
  }

  // Upsert: re-activate if revoked, create if missing
  const subscription = await db.subscription.upsert({
    where: {
      playerId_eventSlug: { playerId, eventSlug },
    },
    update: { state: 'active' },
    create: {
      playerId,
      eventSlug,
      state: 'active',
    },
    select: { id: true, state: true },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}

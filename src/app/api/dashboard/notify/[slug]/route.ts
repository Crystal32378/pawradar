import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireEventOwnership } from '@/lib/auth-server';
import {
  isOnesignalServerConfigured,
  onesignalAppId,
  onesignalRestApiKey,
} from '@/lib/onesignal-config';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const notifySchema = z.object({
  type: z.enum(['reschedule', 'cancel', 'update']),
  message: z.string().min(1).max(280),
  // For reschedule: new start time ISO string
  newWalkStart: z.string().optional(),
});

/**
 * POST /api/dashboard/notify/[slug]
 *
 * Creator-only endpoint. Sends a Web Push notification to all fans
 * who opted in to this event's subscription list.
 *
 * Auth + ownership required — even if the API key were public, an
 * attacker couldn't impersonate a creator because we check ownership
 * against the session user before touching OneSignal.
 *
 * Server-side only: REST API key is never sent to the client.
 * Returns 501 if feature flag is off or API key is missing.
 *
 * Phase 2: this endpoint is wired and tested against the schema,
 * but no production notifications have been sent — Crystal must
 * provide ONESIGNAL_REST_API_KEY via Vercel env vars before deploy.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  // 1. Auth + ownership check FIRST — never reveal API state to non-owners
  const [_event, response] = await requireEventOwnership(slug);
  if (response) return response;

  // 2. Hard gate: feature flag off
  if (!isOnesignalServerConfigured) {
    return NextResponse.json(
      {
        error: '通知功能未啟用',
        reason: onesignalAppId ? 'missing_rest_api_key' : 'feature_disabled',
      },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '輸入內容有誤', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { type, message, newWalkStart } = parsed.data;

  // 3. Fetch active subscriber player IDs for this event
  const subscribers = await db.subscription.findMany({
    where: { eventSlug: slug, state: 'active' },
    select: { playerId: true },
  });

  if (subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: '沒有訂閱者' });
  }

  const playerIds = subscribers.map((s) => s.playerId);

  // 4. Build OneSignal REST API payload
  //    Reference: https://documentation.onesignal.com/reference/create-notification
  const headings = {
    reschedule: '散步時間改期！',
    cancel: '散步取消',
    update: '散步資訊更新',
  } as const;

  const payload = {
    app_id: onesignalAppId,
    include_player_ids: playerIds,
    headings: { en: headings[type], zh: headings[type] },
    contents: {
      en: message,
      zh: message,
    },
    // Web push specific
    web_buttons: [],
    // Custom data so the client can deep-link to the event
    data: {
      eventSlug: slug,
      type,
      newWalkStart,
    },
  };

  // 5. Call OneSignal REST API (server-side, secret never leaves here)
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${onesignalRestApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[PawRadar] OneSignal API error:', res.status, errorText);
      return NextResponse.json(
        { error: '通知發送失敗', detail: errorText },
        { status: 502 },
      );
    }

    const result = await res.json();
    return NextResponse.json({
      sent: result.recipients ?? playerIds.length,
      onesignalId: result.id,
    });
  } catch (err) {
    console.error('[PawRadar] OneSignal fetch failed:', err);
    return NextResponse.json(
      { error: '網路錯誤，無法聯繫 OneSignal' },
      { status: 502 },
    );
  }
}

import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isOnesignalEnabled } from '@/lib/onesignal-config';
import { rateLimit, requestIp, retryAfterSeconds } from '@/lib/rate-limit';

const subscribeSchema = z.object({
  subscriptionId: z.string().min(10).max(200),
  eventSlug: z.string().min(1).max(120),
});

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function POST(request: Request) {
  if (!isOnesignalEnabled) {
    return NextResponse.json({ error: '通知功能未啟用' }, { status: 501 });
  }
  const result = await rateLimit(`subscribe:${requestIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!result.allowed) {
    return NextResponse.json(
      { error: '請稍後再試' },
      {
        status: 429,
        headers: { 'Retry-After': retryAfterSeconds(result.resetAt) },
      },
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
    return NextResponse.json({ error: '輸入內容有誤' }, { status: 400 });
  }

  const event = await db.event.findUnique({
    where: { slug: parsed.data.eventSlug },
    select: { id: true, status: true },
  });
  if (!event || event.status === 'cancelled') {
    return NextResponse.json({ error: '找不到可訂閱的散步事件' }, { status: 404 });
  }

  const unsubscribeToken = randomBytes(32).toString('base64url');
  const subscription = await db.subscription.upsert({
    where: {
      onesignalSubscriptionId_eventId: {
        onesignalSubscriptionId: parsed.data.subscriptionId,
        eventId: event.id,
      },
    },
    update: {
      state: 'active',
      unsubscribeTokenHash: tokenHash(unsubscribeToken),
    },
    create: {
      onesignalSubscriptionId: parsed.data.subscriptionId,
      eventId: event.id,
      state: 'active',
      unsubscribeTokenHash: tokenHash(unsubscribeToken),
    },
    select: { id: true, state: true },
  });

  return NextResponse.json({ subscription, unsubscribeToken }, { status: 201 });
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }
  const parsed = z.object({ unsubscribeToken: z.string().min(20).max(200) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '退訂連結無效' }, { status: 400 });
  }
  const subscription = await db.subscription.findUnique({
    where: { unsubscribeTokenHash: tokenHash(parsed.data.unsubscribeToken) },
    select: { id: true },
  });
  if (!subscription) {
    return NextResponse.json({ error: '退訂連結無效或已失效' }, { status: 404 });
  }
  await db.subscription.update({
    where: { id: subscription.id },
    data: { state: 'revoked' },
  });
  return NextResponse.json({ ok: true });
}

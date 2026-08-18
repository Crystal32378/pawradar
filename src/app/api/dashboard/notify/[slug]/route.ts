import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireEventOwnership, validateMutationOrigin } from '@/lib/auth-server';
import { onesignalAppId } from '@/lib/onesignal-config';
import {
  isOnesignalServerConfigured,
  sendOneSignalPush,
} from '@/lib/onesignal-server';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const notifySchema = z.object({
  type: z.enum(['reschedule', 'cancel', 'update']),
});

export async function POST(request: Request, { params }: RouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const { slug } = await params;
  const [ownedEvent, response] = await requireEventOwnership(slug);
  if (response) return response;

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
    return NextResponse.json({ error: '輸入內容有誤' }, { status: 400 });
  }

  const event = await db.event.findUniqueOrThrow({
    where: { id: ownedEvent!.id },
    select: {
      slug: true,
      petName: true,
      walkStart: true,
      location: true,
      status: true,
      subscriptions: {
        where: { state: 'active' },
        select: { onesignalSubscriptionId: true },
      },
    },
  });
  const { type } = parsed.data;
  if (type === 'cancel' && event.status !== 'cancelled') {
    return NextResponse.json(
      { error: '請先在活動資料中完成取消，再發送通知' },
      { status: 409 },
    );
  }
  if (type !== 'cancel' && event.status === 'cancelled') {
    return NextResponse.json({ error: '活動已取消' }, { status: 409 });
  }

  const subscriptionIds = event.subscriptions.map(
    (subscription) => subscription.onesignalSubscriptionId,
  );
  if (subscriptionIds.length === 0) {
    return NextResponse.json({ sent: 0, message: '沒有訂閱者' });
  }

  const formattedStart = new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Taipei',
  }).format(event.walkStart);
  const headings = {
    reschedule: '散步時間改期',
    cancel: '散步已取消',
    update: '散步資訊更新',
  } as const;
  const contents = {
    reschedule: `${event.petName}的散步改到 ${formattedStart}，地點：${event.location}`,
    cancel: `${event.petName}的這場散步已取消。`,
    update: `${event.petName}的散步資訊已更新：${formattedStart}，${event.location}`,
  } as const;

  try {
    const result = await sendOneSignalPush({
      heading: headings[type],
      content: contents[type],
      eventSlug: event.slug,
      type,
      subscriptionIds,
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({
      sent: result.recipients ?? subscriptionIds.length,
      onesignalId: result.id,
    });
  } catch {
    return NextResponse.json({ error: '通知發送失敗，活動資料已保留' }, { status: 502 });
  }
}

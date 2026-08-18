import 'server-only';

import { onesignalAppId } from './onesignal-config';

export const onesignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY ?? '';
export const isOnesignalServerConfigured =
  Boolean(onesignalAppId) && Boolean(onesignalRestApiKey);

export interface PushMessage {
  heading: string;
  content: string;
  eventSlug: string;
  type: 'reschedule' | 'cancel' | 'update';
  subscriptionIds: string[];
  origin: string;
}

export function buildOneSignalPayload(message: PushMessage) {
  return {
    app_id: onesignalAppId,
    include_subscription_ids: message.subscriptionIds,
    target_channel: 'push',
    headings: { en: message.heading, zh: message.heading },
    contents: { en: message.content, zh: message.content },
    url: `${message.origin}/?event=${encodeURIComponent(message.eventSlug)}`,
    data: { eventSlug: message.eventSlug, type: message.type },
  };
}

export async function sendOneSignalPush(message: PushMessage) {
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Key ${onesignalRestApiKey}`,
    },
    body: JSON.stringify(buildOneSignalPayload(message)),
  });

  if (!response.ok) {
    console.error('[PawRadar] OneSignal API failed with status', response.status);
    throw new Error('OneSignal API request failed');
  }

  return (await response.json()) as { id?: string; recipients?: number };
}

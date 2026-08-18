import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('OneSignal v16 REST payload', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = 'app-id';
    process.env.ONESIGNAL_REST_API_KEY = 'server-secret';
  });

  it('targets subscription IDs and never uses the legacy player field', async () => {
    const { buildOneSignalPayload } = await import('../onesignal-server');
    const payload = buildOneSignalPayload({
      heading: '散步已取消',
      content: '麻糬的散步已取消',
      eventSlug: 'meet_safe',
      type: 'cancel',
      subscriptionIds: ['subscription-1'],
      origin: 'https://pawradar.example',
    });
    expect(payload.include_subscription_ids).toEqual(['subscription-1']);
    expect(payload.url).toBe('https://pawradar.example/?event=meet_safe');
    expect(payload).not.toHaveProperty('include_player_ids');
  });
});

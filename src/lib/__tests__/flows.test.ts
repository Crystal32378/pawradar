/**
 * PawRadar end-to-end flow tests (fixture-based, no real database).
 *
 * Verifies the complete creator/fan journeys through the actual API route
 * handlers with an in-memory Prisma fixture:
 *
 *   signup → login → create event → list → reschedule → cancel →
 *   ICS blocked after cancel → subscribe → unsubscribe → delete
 *
 * Plus the security invariants:
 *   - ownership: another creator cannot mutate your event
 *   - session revocation invalidates existing cookies
 *   - OneSignal disabled ⇒ subscribe/notify short-circuit with 501
 *   - cancelled events never serve a fresh ICS
 *
 * These tests are the reproducible local acceptance suite for the main
 * user flows. They do NOT touch a real database and never pretend the
 * production stack has been exercised.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test-only dummy secrets (never a real key — the auth HMAC just needs a
// stable ≥32-char value to sign session cookies deterministically).
vi.hoisted(() => {
  process.env.SESSION_SECRET = 'pawradar-flow-test-secret-0123456789abcdef';
  process.env.RATE_LIMIT_SECRET = 'pawradar-flow-test-secret-0123456789abcdef';
});

// ---------------------------------------------------------------------------
// In-memory fixtures (vi.hoisted so mocks can reference them)
// ---------------------------------------------------------------------------
const { cookieStore, memDb } = vi.hoisted(() => {
  const cookieStore = new Map<string, string>();
  const memDb = {
    users: new Map<
      string,
      {
        id: string;
        email: string;
        password: string;
        name: string | null;
        igHandle: string | null;
        sessionVersion: number;
      }
    >(),
    events: new Map<
      string,
      {
        id: string;
        slug: string;
        petName: string;
        ownerHandle: string;
        walkStart: Date;
        walkEnd: Date;
        location: string;
        notes: string | null;
        ownerId: string;
        status: 'active' | 'cancelled';
        addCount: number;
        createdAt: Date;
      }
    >(),
    subscriptions: new Map<
      string,
      {
        id: string;
        onesignalSubscriptionId: string;
        eventId: string;
        state: 'active' | 'revoked';
        unsubscribeTokenHash: string;
      }
    >(),
    nextUserId: 1,
    nextEventId: 1,
    nextSubscriptionId: 1,
  };
  return { cookieStore, memDb };
});

// bcrypt cost 12 is intentionally slow in production; the flow tests only
// need the hash/compare contract, not the real KDF cost.
vi.mock('bcryptjs', () => ({
  default: {
    hash: async (value: string) => `hashed:${value}`,
    compare: async (value: string, hash: string) => hash === `hashed:${value}`,
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

// Allow-all rate limit for flow tests (real bucket logic is covered by
// rate-limit.test.ts against a mocked query path).
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: async () => ({ allowed: true, remaining: 99, resetAt: new Date() }),
  requestIp: (request: Request) =>
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
  opaqueRateLimitKey: (...parts: string[]) => parts.join('::'),
  retryAfterSeconds: () => 0,
}));

// Default: OneSignal disabled (matches a fresh checkout without real keys).
// A per-test toggle flips it on to exercise subscribe/unsubscribe.
vi.mock('@/lib/onesignal-config', () => ({
  // Getters so the per-test toggle is read at call time, not module load.
  get isOnesignalEnabled() {
    return (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled ?? false;
  },
  get onesignalAppId() {
    return (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled
      ? 'test-app-id'
      : '';
  },
}));

// ---------------------------------------------------------------------------
// Prisma fixture client
// ---------------------------------------------------------------------------
const selectFields = <T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean>,
): Record<string, unknown> => {
  if (!select) return { ...row };
  return Object.fromEntries(Object.entries(row).filter(([k]) => select[k] === true));
};

// OneSignal server: pretend REST is configured (per-test toggle), capture
// the outgoing push payload so we can assert notification content comes from
// stored event data.
vi.mock('@/lib/onesignal-server', () => ({
  get isOnesignalServerConfigured() {
    return (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled ?? false;
  },
  sendOneSignalPush: async (payload: unknown) => {
    (globalThis as unknown as { __lastPushPayload: unknown }).__lastPushPayload = payload;
    return { id: 'test-notification-id', recipients: 1 };
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      create: async ({ data, select }: { data: any; select?: any }) => {
        const id = `u${memDb.nextUserId++}`;
        const row = {
          id,
          email: data.email,
          password: data.password,
          name: data.name ?? null,
          igHandle: data.igHandle ?? null,
          sessionVersion: 1,
        };
        memDb.users.set(id, row);
        return selectFields(row, select);
      },
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        const byEmail = [...memDb.users.values()].find((u) => u.email === where.email);
        const row = byEmail ?? memDb.users.get(where.id);
        return row ? selectFields(row, select) : null;
      },
      update: async ({ where, data, select }: { where: any; data: any; select?: any }) => {
        const row = memDb.users.get(where.id);
        if (!row) throw new Error('user not found');
        Object.assign(row, data);
        return selectFields(row, select);
      },
    },
    event: {
      create: async ({ data, select }: { data: any; select?: any }) => {
        const id = `e${memDb.nextEventId++}`;
        const row = {
          id,
          slug: data.slug,
          petName: data.petName,
          ownerHandle: data.ownerHandle,
          walkStart: data.walkStart,
          walkEnd: data.walkEnd,
          location: data.location,
          notes: data.notes ?? null,
          ownerId: data.ownerId,
          status: 'active' as const,
          addCount: 0,
          createdAt: new Date(),
        };
        memDb.events.set(id, row);
        return selectFields(row, select);
      },
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        const row = [...memDb.events.values()].find(
          (e) => e.slug === where.slug || e.id === where.id,
        );
        return row ? selectFields(row, select) : null;
      },
      findUniqueOrThrow: async ({ where, select }: { where: any; select?: any }) => {
        const row =
          memDb.events.get(where.id) ??
          [...memDb.events.values()].find((e) => e.slug === where.slug);
        if (!row) throw new Error('event not found');
        const result = selectFields(row, select) as Record<string, unknown>;
        // Relation select: subscriptions (active) for the notify endpoint.
        if (select?.subscriptions) {
          result.subscriptions = [...memDb.subscriptions.values()]
            .filter((s) => s.eventId === row.id && s.state === 'active')
            .map((s) => ({ onesignalSubscriptionId: s.onesignalSubscriptionId }));
        }
        return result;
      },
      findMany: async ({ where, orderBy, select }: { where: any; orderBy?: any; select?: any }) => {
        let rows = [...memDb.events.values()];
        if (where?.ownerId) rows = rows.filter((e) => e.ownerId === where.ownerId);
        if (orderBy?.createdAt === 'desc') {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return rows.map((r) => selectFields(r, select));
      },
      update: async ({ where, data, select }: { where: any; data: any; select?: any }) => {
        const row =
          memDb.events.get(where.id) ??
          [...memDb.events.values()].find((e) => e.slug === where.slug);
        if (!row) throw new Error('event not found');
        if (data.addCount) {
          row.addCount += data.addCount.increment ?? 0;
        }
        Object.assign(row, {
          petName: data.petName ?? row.petName,
          ownerHandle: data.ownerHandle ?? row.ownerHandle,
          walkStart: data.walkStart ?? row.walkStart,
          walkEnd: data.walkEnd ?? row.walkEnd,
          location: data.location ?? row.location,
          notes: data.notes === undefined ? row.notes : data.notes,
          status: data.status ?? row.status,
        });
        return selectFields(row, select);
      },
      delete: async ({ where }: { where: any }) => {
        memDb.events.delete(where.id);
        for (const [sid, s] of memDb.subscriptions) {
          if (s.eventId === where.id) memDb.subscriptions.delete(sid);
        }
        return { id: where.id };
      },
    },
    subscription: {
      upsert: async ({ where, update, create, select }: { where: any; update: any; create: any; select?: any }) => {
        const existing = [...memDb.subscriptions.values()].find(
          (s) =>
            s.onesignalSubscriptionId ===
              where.onesignalSubscriptionId_eventId.onesignalSubscriptionId &&
            s.eventId === where.onesignalSubscriptionId_eventId.eventId,
        );
        if (existing) {
          Object.assign(existing, update);
          return selectFields(existing, select);
        }
        const id = `s${memDb.nextSubscriptionId++}`;
        const row = {
          id,
          onesignalSubscriptionId: create.onesignalSubscriptionId,
          eventId: create.eventId,
          state: create.state,
          unsubscribeTokenHash: create.unsubscribeTokenHash,
        };
        memDb.subscriptions.set(id, row);
        return selectFields(row, select);
      },
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        const row = [...memDb.subscriptions.values()].find(
          (s) => s.unsubscribeTokenHash === where.unsubscribeTokenHash,
        );
        return row ? selectFields(row, select) : null;
      },
      update: async ({ where, data, select }: { where: any; data: any; select?: any }) => {
        const row = memDb.subscriptions.get(where.id);
        if (!row) throw new Error('subscription not found');
        Object.assign(row, data);
        return selectFields(row, select);
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Route handlers (imported AFTER mocks are registered)
// ---------------------------------------------------------------------------
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import {
  GET as listEvents,
  POST as createEvent,
} from '@/app/api/dashboard/events/route';
import {
  PATCH as patchEvent,
  DELETE as deleteEvent,
} from '@/app/api/dashboard/events/[slug]/route';
import { GET as getEvent } from '@/app/api/events/[slug]/route';
import { GET as getIcs } from '@/app/api/ics/[slug]/route';
import {
  POST as subscribe,
  DELETE as unsubscribe,
} from '@/app/api/subscriptions/route';
import { POST as notify } from '@/app/api/dashboard/notify/[slug]/route';

const ORIGIN = 'http://localhost:3000';

function jsonRequest(
  url: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

async function createCreator(email: string, password = 'abc12345', name = '測試創作者') {
  const res = await signup(jsonRequest(`${ORIGIN}/api/auth/signup`, { email, password, name }));
  expect(res.status).toBe(201);
  await login(jsonRequest(`${ORIGIN}/api/auth/login`, { email, password }));
}

async function createWalk(petName = '小白', extra: Record<string, unknown> = {}) {
  const res = await createEvent(
    jsonRequest(`${ORIGIN}/api/dashboard/events`, {
      petName,
      ownerHandle: '@walker',
      walkStart: '2026-09-01T10:00:00+08:00',
      durationMinutes: 60,
      location: '大安森林公園',
      notes: '',
      ...extra,
    }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).event as { slug: string };
}

beforeEach(() => {
  cookieStore.clear();
  memDb.users.clear();
  memDb.events.clear();
  memDb.subscriptions.clear();
  memDb.nextUserId = 1;
  memDb.nextEventId = 1;
  memDb.nextSubscriptionId = 1;
  (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = false;
});

describe('creator journey (signup → login → events)', () => {
  it('signs up, logs in, and lists an empty dashboard', async () => {
    await createCreator('a@example.com');
    const res = await listEvents();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toEqual([]);
  });

  it('rejects dashboard access without a session', async () => {
    const res = await listEvents();
    expect(res.status).toBe(401);
  });

  it('creates an event and sees it in the dashboard list', async () => {
    await createCreator('b@example.com');
    const created = await createWalk('小黑');
    expect(created.slug.length).toBeGreaterThan(0);

    const list = await listEvents();
    const data = await list.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].petName).toBe('小黑');
    expect(data.events[0].status).toBe('active');
    expect(data.events[0].addCount).toBe(0);
  });

  it('exposes the public fan view for an active event', async () => {
    await createCreator('c@example.com');
    const { slug } = await createWalk('小花');
    const res = await getEvent(new Request(`${ORIGIN}/api/events/${slug}`), {
      params: Promise.resolve({ slug }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event.petName).toBe('小花');
    expect(data.event.status).toBe('active');
  });
});

describe('ownership & authorization', () => {
  it('forbids another creator from patching your event', async () => {
    await createCreator('owner@example.com');
    const { slug } = await createWalk('阿黃');

    cookieStore.clear();
    await createCreator('intruder@example.com');

    const res = await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, { petName: '改名' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(403);
  });

  it('forbids anonymous patching', async () => {
    await createCreator('d@example.com');
    const { slug } = await createWalk('咪咪');
    cookieStore.clear();
    const res = await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, { petName: 'hack' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(401);
  });

  it('rejects cross-site mutation (Origin mismatch)', async () => {
    await createCreator('e@example.com');
    const evil = new Request(`${ORIGIN}/api/dashboard/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      body: JSON.stringify({
        petName: 'x',
        ownerHandle: '@x',
        walkStart: '2026-09-01T10:00:00+08:00',
        durationMinutes: 30,
        location: 'y',
      }),
    });
    const res = await createEvent(evil);
    expect(res.status).toBe(403);
  });
});

describe('reschedule → cancel → ICS lifecycle', () => {
  it('reschedules an owned event', async () => {
    await createCreator('f@example.com');
    const { slug } = await createWalk('樂樂');
    const res = await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, {
        walkStart: '2026-09-02T15:30:00+08:00',
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event.walkStart).toBe('2026-09-02T07:30:00.000Z');
    expect(data.event.walkEnd).toBe('2026-09-02T08:30:00.000Z');
  });

  it('serves a valid ICS for an active event and bumps addCount', async () => {
    await createCreator('g@example.com');
    const { slug } = await createWalk('毛毛');
    const res = await getIcs(new Request(`${ORIGIN}/api/ics/${slug}`), {
      params: Promise.resolve({ slug }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/calendar');
    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('毛毛');

    const list = await listEvents();
    const data = await list.json();
    expect(data.events[0].addCount).toBe(1);
  });

  it('blocks ICS download after cancellation (410)', async () => {
    await createCreator('h@example.com');
    const { slug } = await createWalk('大寶');
    const cancel = await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, { status: 'cancelled' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(cancel.status).toBe(200);

    const ics = await getIcs(new Request(`${ORIGIN}/api/ics/${slug}`), {
      params: Promise.resolve({ slug }),
    });
    expect(ics.status).toBe(410);
  });

  it('rejects cancel notification before the event is actually cancelled', async () => {
    await createCreator('i@example.com');
    const { slug } = await createWalk('小乖');
    (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = true;
    const res = await notify(
      jsonRequest(`${ORIGIN}/api/dashboard/notify/${slug}`, { type: 'cancel' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(409);
  });
});

describe('subscriptions (OneSignal enabled toggle)', () => {
  it('short-circuits with 501 when OneSignal is disabled', async () => {
    await createCreator('j@example.com');
    const { slug } = await createWalk();
    const res = await subscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        subscriptionId: 'subscription-test-12345',
        eventSlug: slug,
      }),
    );
    expect(res.status).toBe(501);
  });

  it('subscribes per-event and unsubscribes with a single-use token', async () => {
    await createCreator('k@example.com');
    const { slug } = await createWalk('波比');
    (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = true;

    const sub = await subscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        subscriptionId: 'sub-id-abcdef123',
        eventSlug: slug,
      }),
    );
    expect(sub.status).toBe(201);
    const subData = await sub.json();
    expect(subData.unsubscribeToken).toBeTruthy();

    const del1 = await unsubscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        unsubscribeToken: subData.unsubscribeToken,
      }),
    );
    expect(del1.status).toBe(200);

    const del2 = await unsubscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        unsubscribeToken: subData.unsubscribeToken,
      }),
    );
    expect(del2.status).toBe(404);
  });

  it('rejects subscribing to a cancelled event', async () => {
    await createCreator('l@example.com');
    const { slug } = await createWalk('胖胖');
    await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, { status: 'cancelled' }),
      { params: Promise.resolve({ slug }) },
    );
    (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = true;
    const res = await subscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        subscriptionId: 'sub-id-cancel-12345',
        eventSlug: slug,
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('notify payload integrity', () => {
  it('sends reschedule notification built from stored event data', async () => {
    await createCreator('p@example.com');
    const { slug } = await createWalk('豆花');
    (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = true;

    await subscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        subscriptionId: 'sub-push-12345',
        eventSlug: slug,
      }),
    );

    await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, {
        walkStart: '2026-09-03T09:00:00+08:00',
      }),
      { params: Promise.resolve({ slug }) },
    );

    const res = await notify(
      jsonRequest(`${ORIGIN}/api/dashboard/notify/${slug}`, { type: 'reschedule' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(1);

    const payload = (globalThis as unknown as { __lastPushPayload: any }).__lastPushPayload;
    expect(payload.heading).toBe('散步時間改期');
    expect(payload.content).toContain('豆花');
    expect(payload.content).toContain('2026年9月3日');
    expect(payload.content).toContain('大安森林公園');
    expect(payload.subscriptionIds).toEqual(['sub-push-12345']);
    expect(payload.eventSlug).toBe(slug);
    expect(payload.type).toBe('reschedule');
  });

  it('sends cancel notification only after the event is actually cancelled', async () => {
    await createCreator('q@example.com');
    const { slug } = await createWalk('麻糬');
    (globalThis as unknown as { __oneSignalEnabled: boolean }).__oneSignalEnabled = true;

    await subscribe(
      jsonRequest(`${ORIGIN}/api/subscriptions`, {
        subscriptionId: 'sub-push-cancel-1',
        eventSlug: slug,
      }),
    );
    await patchEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events/${slug}`, { status: 'cancelled' }),
      { params: Promise.resolve({ slug }) },
    );

    const res = await notify(
      jsonRequest(`${ORIGIN}/api/dashboard/notify/${slug}`, { type: 'cancel' }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(200);
    const payload = (globalThis as unknown as { __lastPushPayload: any }).__lastPushPayload;
    expect(payload.heading).toBe('散步已取消');
    expect(payload.content).toContain('麻糬');
  });
});

describe('session security', () => {
  it('revokes sessions when sessionVersion changes', async () => {
    await createCreator('m@example.com');
    const user = [...memDb.users.values()][0];
    user.sessionVersion += 1;

    const res = await listEvents();
    expect(res.status).toBe(401);
  });
});

describe('delete lifecycle', () => {
  it('deletes an owned event', async () => {
    await createCreator('n@example.com');
    const { slug } = await createWalk('豆豆');
    const res = await deleteEvent(
      new Request(`${ORIGIN}/api/dashboard/events/${slug}`, {
        method: 'DELETE',
        headers: { Origin: ORIGIN },
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(200);
    const list = await listEvents();
    const data = await list.json();
    expect(data.events).toHaveLength(0);
  });
});

describe('validation', () => {
  it('rejects an event with a too-short duration', async () => {
    await createCreator('o@example.com');
    const res = await createEvent(
      jsonRequest(`${ORIGIN}/api/dashboard/events`, {
        petName: '小短',
        ownerHandle: '@walker',
        walkStart: '2026-09-01T10:00:00+08:00',
        durationMinutes: 5,
        location: '公園',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects signup with a weak password', async () => {
    const res = await signup(
      jsonRequest(`${ORIGIN}/api/auth/signup`, {
        email: 'weak@example.com',
        password: 'short',
        name: '弱密碼',
      }),
    );
    expect(res.status).toBe(400);
  });
});

# OneSignal Web Push — Architecture

> Phase 2 implementation. Feature-flagged. No production notifications
> have been sent. Crystal must provide `NEXT_PUBLIC_ONESIGNAL_APP_ID`
> and `ONESIGNAL_REST_API_KEY` via Vercel env vars before deploy.
>
> This document is the source of truth for how OneSignal integrates
> with PawRadar's product values.

---

## 1. Product principle

> **OneSignal is opt-in, never replaces ICS, never gates fan public view.**

PawRadar's golden path is: IG bio link → web page → tap "加入日曆" →
native calendar prompt. This must remain zero-friction for fans.

OneSignal Web Push is **a layer on top of ICS**, not a replacement.
It exists to handle cases ICS cannot:

| Use case | ICS handles? | OneSignal needed? |
|----------|-------------|-------------------|
| 散步開始前 1 小時提醒 | ✅ 日曆提醒 | ❌ No |
| 主理人改期散步 | ❌ ICS is immutable once downloaded | ✅ Yes |
| 主理人取消散步 | ❌ Same | ✅ Yes |
| 主理人更新地點 | ❌ Same | ✅ Yes |

**Phase 2 only supports the three "yes" rows.** Phase 1 of Shipaton
Shipaton award does NOT require us to add "walk starting soon" push —
that's redundant with calendar reminders.

---

## 2. Feature flag

```ts
// src/lib/onesignal-config.ts
export const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '';
export const isOnesignalEnabled = Boolean(onesignalAppId);
```

**When flag is off** (default, current state):

- `NotifyOptInDialog` returns `null` — never renders
- `initOnesignal()` returns `false` — no SDK loaded
- `/api/subscriptions` returns 501 with `reason: feature_disabled`
- `/api/dashboard/notify/[slug]` returns 501

**When flag is on** (Crystal sets env vars):

- `NotifyOptInDialog` renders after ICS download
- Fan sees iOS limitation warning + privacy note
- Fan taps "接收通知" → browser permission prompt
- On accept: `playerId` POSTed to `/api/subscriptions`
- Creator can use `/dashboard/notify/[slug]` button (future UI)

---

## 3. Data flow

```
┌──────────────────────────────────────────────────────────────────┐
│ FAN SIDE (anonymous, public)                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Visit /?event=meet_xxx                                        │
│  2. Tap "加入日曆" → ICS download starts                          │
│  3. (after 1.5s) NotifyOptInDialog appears                       │
│  4. Fan taps "接收通知"                                            │
│  5. initOnesignal() loads OneSignal SDK from CDN                 │
│  6. OneSignal.setSubscription(true) → browser permission prompt   │
│  7. On accept: getSubscription() returns playerId                 │
│  8. POST /api/subscriptions { playerId, eventSlug }              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ SERVER SIDE                                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  /api/subscriptions (POST, public, rate-limited 10/min/IP)        │
│   - zod validates playerId + eventSlug                            │
│   - Verifies event exists                                         │
│   - Upserts Subscription row (state="active")                    │
│   - Returns 201                                                   │
│                                                                    │
│  /api/dashboard/notify/[slug] (POST, auth + ownership)            │
│   - requireEventOwnership() checks session + event.ownerId       │
│   - Fetches Subscription rows where eventSlug=slug, state=active  │
│   - Builds OneSignal REST payload                                 │
│   - POST https://onesignal.com/api/v1/notifications               │
│     with Authorization: Basic <ONESIGNAL_REST_API_KEY>            │
│   - Returns { sent: N, onesignalId: "..." }                     │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ CREATOR SIDE (auth'd, dashboard)                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Future: "通知粉絲" button on event card                          │
│  → opens dialog: "改期" / "取消" / "更新資訊"                     │
│  → creator picks type + writes message                            │
│  → POST /api/dashboard/notify/[slug] { type, message }            │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Security model

### Client-side (browser)

- Only `NEXT_PUBLIC_ONESIGNAL_APP_ID` is exposed (it's a public identifier —
  OneSignal designed it to be embedded in client code).
- `ONESIGNAL_REST_API_KEY` is NEVER imported into any `'use client'` module.
- The OneSignal SDK loads lazily from CDN; not bundled.

### Server-side

- `/api/subscriptions` is public (fans are anonymous) but rate-limited.
- `/api/dashboard/notify/[slug]` requires:
  1. Valid NextAuth session
  2. `session.user.id === event.ownerId`
  Without both, returns 401/403 before touching OneSignal API.
- OneSignal REST API key stays on the server. Even if a malicious fan
  tried to call `/api/dashboard/notify/...` directly, ownership check
  blocks them.

### Subscription lifecycle

| State | Trigger | Receives notifications? |
|-------|---------|-------------------------|
| `active` | Fan opts in (default on subscribe) | ✅ Yes |
| `revoked` | Fan explicitly opts out (future UI) | ❌ No |
| `muted` | Future: fan pauses (not yet implemented) | ❌ No |

When an event is deleted (cascade from Event):
- All `Subscription` rows for that `eventSlug` are auto-deleted (Prisma `onDelete: Cascade`)
- No orphan subscribers remain

---

## 5. iOS Web Push limitation

Critical product disclosure — included verbatim in the opt-in dialog:

> iPhone 使用者注意
> iOS 16.4 以上需先「加入主畫面」成 Web App 才能接收通知。
> 若你的 iOS 不支援，日曆提醒仍會正常運作。

**Implication for product**:

- iPhone fans effectively default to ICS-only (the core PawRadar path).
- OneSignal Web Push on iPhone requires:
  1. iOS 16.4+
  2. User adds the site to Home Screen
  3. User opens from Home Screen icon
  4. User grants notification permission inside that PWA context
- This is a 3-4 step friction beyond the ICS golden path.
- **We accept this** — ICS is sufficient for the core "預約制偶遇" promise.

For Shipaton: this is actually a *strength* of the narrative —
"OneSignal augments ICS where ICS can't reach (change/cancel),
rather than fighting iOS's web push constraints."

---

## 6. What Crystal must do (before enabling in production)

1. Sign up at https://onesignal.com (free tier covers 10K web push subscribers)
2. Create a new OneSignal app, pick "Web Push"
3. Configure the site URL (production vercel URL)
4. Upload a small notification icon (use PawRadar paw print)
5. Copy `App ID` → set as `NEXT_PUBLIC_ONESIGNAL_APP_ID` in Vercel env vars
6. Copy `REST API Key` → set as `ONESIGNAL_REST_API_KEY` (secret, server-only)
7. Optional: configure Ship Kit Growth Plan (3-month free trial via Devpost)
8. Test on desktop Chrome/Edge first (no iOS friction)
9. Test on iPhone via "Add to Home Screen" flow

**Do NOT do during this audit round** (Crystal's instruction):
- Do not register the OneSignal app
- Do not obtain or paste real API secrets
- Do not deploy a service worker (Next.js handles this via SDK init)
- Do not modify DNS

---

## 7. What was tested vs not

### Tested (Phase 2 in this audit)

- ✅ Feature flag: when env vars empty, all OneSignal code paths return 501/null
- ✅ Schema: `Subscription` model has correct unique constraint + cascade
- ✅ Zod validation: bad payloads rejected
- ✅ Auth + ownership: `/api/dashboard/notify/[slug]` checks session + ownership before OneSignal
- ✅ Rate limiting: `/api/subscriptions` limited to 10/IP/min
- ✅ UI: dialog renders correctly with iOS limitation + privacy notes
- ✅ TypeScript: all `src/` files pass `tsc --noEmit`

### Not tested (gated on real App ID)

- ❌ Real OneSignal SDK init in browser
- ❌ Real browser permission prompt flow
- ❌ Real notification delivery end-to-end
- ❌ iOS PWA flow via Home Screen
- ❌ OneSignal webhook callbacks (not yet implemented — future: track delivery status)

These will require Crystal to complete Section 6 above before Phase 2
can be considered production-ready.

---

## 8. Shipaton OneSignal Award alignment

**Award**: "Keep Them Coming Back" (Shipaton 2026, sponsored by OneSignal)
**Prize**: $40K+ in cash + Ship Kit Growth Plan (3 months free)

**PawRadar narrative fit** (assuming Phase 2 ships):

| Award criterion | PawRadar fit |
|-----------------|--------------|
| "Bring users back to your app" | Fans return when creator sends reschedule/cancel — re-engagement after initial ICS download |
| "Effective OneSignal SDK usage" | Segmented notifications by event subscription (not blanket broadcast) |
| "Retention / engagement impact" | Reduces no-shows when plans change — direct retention metric |

**Risks**:

1. Without real subscriber volume, the narrative is thin
2. iOS limitation reduces iPhone user retention value
3. Web-only deployment may not qualify (see Shipaton eligibility gate)

**Recommendation**: ship Phase 2 with feature flag ON once Crystal
provides App ID, recruit 5-10 KOL beta testers, measure subscriber
conversion + creator usage, then make Shipaton go/no-go decision
based on real numbers.

---

## 9. Files added/modified for Phase 2

| File | Purpose |
|------|---------|
| `src/lib/onesignal-config.ts` | Feature flag + env var exports |
| `src/lib/onesignal-client.ts` | Client SDK loader + init + prompt helpers |
| `src/app/api/subscriptions/route.ts` | Fan subscribe endpoint (public, rate-limited) |
| `src/app/api/dashboard/notify/[slug]/route.ts` | Creator notify endpoint (auth + ownership) |
| `src/components/pawradar/notify-opt-in-dialog.tsx` | Post-ICS opt-in dialog |
| `src/components/pawradar/fan-invite.tsx` | Modified to show dialog after ICS |
| `prisma/schema.prisma` | Added `Subscription` model + cascade |
| `.env.example` | Added OneSignal env var docs |
| `download/ONESIGNAL.md` | This document |

---

## 10. Future improvements (not in Phase 2)

- **Unsubscribe UI**: a small `/unsubscribe?token=...` page for fans
  to revoke their subscription without contacting the creator
- **Notification delivery status**: OneSignal webhook → record delivery
  receipt in `Subscription` for creator analytics
- **Pre-walk reminder** (3 hours before): explicitly OUT OF SCOPE for
  Phase 2 — calendar reminders already cover this
- **Batch notify** for creators with multiple events: a "broadcast"
  feature for community-wide announcements (requires careful anti-spam design)

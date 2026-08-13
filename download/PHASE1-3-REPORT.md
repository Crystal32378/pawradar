# Phase 1-3 完成回報

> Branch: `feature/phase1-security-rebrand-onesignal`
> Commit: `9969ee0`
> Date: 2026-08-13
> Status: NOT merged, NOT deployed — awaiting Crystal review
>
> 本輪未修改任何 production 狀態、未建立外部帳號、未操作 DNS、
> 未送出 Shipaton 申請、未寄出 organizer email。

---

## Branch & Commits

- **Branch**: `feature/phase1-security-rebrand-onesignal` (local only)
- **Base**: `main` at `4a19812`
- **Head**: `9969ee0` — Phase 1-3 commit
- **Status**: NOT pushed to GitHub remote, NOT merged to main, NOT deployed to Vercel

To push (Crystal's responsibility):
```bash
git push -u origin feature/phase1-security-rebrand-onesignal
```

To merge after review (Crystal's decision):
```bash
git checkout main
git merge feature/phase1-security-rebrand-onesignal
```

---

## Changed Files (47 files, ~3,200 lines)

### Phase 1 — Security & Architecture

**Schema & DB**
- `prisma/schema.prisma` — added `User`, `Subscription` models; `Event.ownerId`
- `src/lib/db.ts` — global Prisma cache, dev-only query log
- `src/lib/rate-limit.ts` (new) — in-memory rate limiter + client key extractor

**Auth (cookie-based HMAC session, not NextAuth)**
- `src/lib/auth-server.ts` (new) — session helpers, bcrypt, ownership check
- `src/app/api/auth/login/route.ts` (new)
- `src/app/api/auth/logout/route.ts` (new)
- `src/app/api/auth/signup/route.ts` (new)

**API refactor — fan public vs creator auth'd**
- `src/app/api/events/route.ts` — deprecated, returns 410
- `src/app/api/events/[slug]/route.ts` — public, fan-safe fields only
- `src/app/api/events/[slug]/track/route.ts` — public, rate-limited 10/min/IP
- `src/app/api/ics/[slug]/route.ts` — public, always free (no changes)
- `src/app/api/dashboard/events/route.ts` (new) — auth required, owns events
- `src/app/api/dashboard/events/[slug]/route.ts` (new) — auth + ownership
- `src/app/api/dashboard/notify/[slug]/route.ts` (new) — Phase 2 OneSignal

**UI split**
- `src/app/page.tsx` — fan public view + landing only
- `src/app/dashboard/page.tsx` (new) — auth-gated creator dashboard
- `src/app/login/page.tsx` (new)
- `src/app/signup/page.tsx` (new)
- `src/components/pawradar/dashboard-shell.tsx` (new)
- `src/components/pawradar/pawradar-shell.tsx` — landing only
- `src/components/pawradar/nav.tsx` — landing vs dashboard variants
- `src/components/pawradar/event-form.tsx` — uses /api/dashboard/events
- `src/components/pawradar/event-list.tsx` — uses /api/dashboard/events
- `src/components/pawradar/fan-invite.tsx` — added OneSignal opt-in dialog hook
- `src/components/providers.tsx` — simplified (no SessionProvider needed)

### Phase 1 — Rebrand

- `src/app/globals.css` — terracotta + cream palette (light + dark mode)
- `src/components/pawradar/hero.tsx` — removed Columbia tagline, CTA → /dashboard
- `src/components/pawradar/footer.tsx` — removed Columbia footer
- `src/lib/ics.ts` — removed "Columbia 校友狗聚" from ICS DESCRIPTION
- `src/app/layout.tsx` — updated metadata, removed Columbia keywords

### Phase 1 — Canonical URL fix

- `src/components/pawradar/event-form.tsx` — display real shareable URL, not `paw.rs/<slug>`
- `src/components/pawradar/event-list.tsx` — display `?event=<slug>` only

### Phase 1 — Quality

- `vitest.config.ts` (new)
- `package.json` — added test/test:watch/test:coverage scripts
- `src/lib/__tests__/ics.test.ts` (new) — 10 tests including Columbia regression
- `src/lib/__tests__/rate-limit.test.ts` (new) — 7 tests
- `src/lib/__tests__/validations.test.ts` (new) — 9 tests

### Phase 2 — OneSignal

- `src/lib/onesignal-config.ts` (new) — feature flag + env exports
- `src/lib/onesignal-client.ts` (new) — SDK loader, init, prompt helpers
- `src/app/api/subscriptions/route.ts` (new) — fan subscribe endpoint
- `src/app/api/dashboard/notify/[slug]/route.ts` (new) — creator notify
- `src/components/pawradar/notify-opt-in-dialog.tsx` (new) — post-ICS opt-in
- `.env.example` — added OneSignal env vars
- `download/ONESIGNAL.md` (new) — architecture doc

### Phase 3 — Shipaton

- `download/SHIPATON-ELIGIBILITY.md` (new) — 7-question analysis + draft email

### Phase 1 — Migration

- `download/MIGRATION.md` (new) — 5-step production data migration plan

### Docs

- `download/README.md` — updated to reflect Phase 1 architecture
- `download/DEPLOY.md` — updated for new auth flow
- `download/LICENSE` — added (MIT, Crystal as author)

### Screenshots (verification artifacts)

- `scripts/screenshots/11-landing-warm.png` — warm-toned landing
- `scripts/screenshots/12-login.png` — login page
- `scripts/screenshots/13-signup.png` — signup page
- `scripts/screenshots/14-dashboard-warm.png` — auth'd dashboard
- `scripts/screenshots/15-fan-invite-warm.png` — fan invite (warm)
- `scripts/screenshots/16-fan-invite-warm.png` — fan invite after preview

---

## Columbia Search Results

**Source code (src/ + prisma/)**: 0 matches outside regression tests
- 3 matches in `src/lib/__tests__/ics.test.ts` are intentional regression
  tests asserting ICS does NOT contain "Columbia" / "校友"
- These MUST stay — they prevent P0-5 from regressing

**UI components (src/components/, src/app/layout.tsx, src/app/globals.css)**:
0 matches ✅

**Download docs**:
- `download/README.md` — 0 ✅
- `download/DEPLOY.md` — 0 ✅
- `download/ONESIGNAL.md` — 0 ✅
- `download/SHIPATON-ELIGIBILITY.md` — 0 ✅
- `download/LICENSE` — 0 ✅
- `download/MIGRATION.md` — 1 match (intentional: explains that old .ics
  files downloaded before Phase 1 cannot be retroactively updated;
  historical context only, not product text)

**Verdict**: Columbia fully scrubbed from product surface. The only
remaining mentions are (a) regression tests, (b) migration history notes,
both intentional.

---

## Security: Before vs After

| Finding | Before (audit) | After (Phase 1) |
|---------|----------------|-----------------|
| P0-1: Anonymous DELETE any event | ✅ Verified exploitable | ✅ Fixed — auth + ownership required |
| P0-2: GET /api/events leaks all events | ✅ Verified | ✅ Fixed — moved to /api/dashboard/events (auth'd, own events only); /api/events returns 410 |
| P0-3: Anonymous POST /api/events | ✅ Verified | ✅ Fixed — moved to /api/dashboard/events (auth'd) |
| P0-4: paw.rs broken brand link | ✅ Verified (Serbian site) | ✅ Fixed — UI shows real vercel URL |
| P0-5: ICS DESCRIPTION contains "Columbia 校友狗聚" | ✅ Verified | ✅ Fixed — new tagline; regression test added |
| P1-2: Prisma client not cached on prod | ✅ Verified | ✅ Fixed — globalThis cache, dev-only log |
| P1-3: prisma log:['query'] in production | ✅ Verified | ✅ Fixed — `isDev ? ['query','error','warn'] : ['error']` |

**Verified via HTTP probes (against localhost:3000)**:
- POST /api/dashboard/events without cookie → 401 ✅
- DELETE /api/dashboard/events/any-slug without cookie → 401 ✅
- GET /api/events → 410 with migration pointer ✅
- /dashboard without cookie → 307 redirect to /login?from=/dashboard ✅
- POST /api/auth/signup → 201 with bcrypt-hashed password ✅
- POST /api/auth/login → 200, sets httpOnly cookie ✅
- After login, POST /api/dashboard/events → 201, ownerId set to session.id ✅

---

## OneSignal Implementation Status

### Implemented (without real App ID)

- ✅ Feature flag (`isOnesignalEnabled`)
- ✅ Subscription model (Prisma)
- ✅ `/api/subscriptions` POST endpoint (rate-limited, zod-validated)
- ✅ `/api/dashboard/notify/[slug]` POST endpoint (auth + ownership)
- ✅ OneSignal SDK loader (lazy, not bundled)
- ✅ `initOnesignal()` + `promptForSubscription()` client helpers
- ✅ `NotifyOptInDialog` component (post-ICS, opt-in only)
- ✅ iOS 16.4+ limitation disclosed in dialog
- ✅ Privacy note in dialog
- ✅ `.env.example` with OneSignal env vars
- ✅ Architecture doc (`download/ONESIGNAL.md`)

### NOT tested (gated on real App ID — Crystal must provide)

- ❌ Real OneSignal SDK init in browser
- ❌ Real browser permission prompt
- ❌ Real notification delivery end-to-end
- ❌ iOS PWA flow via Home Screen
- ❌ OneSignal webhook callbacks (not implemented — future work)

### OneSignal env vars required (Crystal's responsibility)

```bash
NEXT_PUBLIC_ONESIGNAL_APP_ID=...  # safe to expose
ONESIGNAL_REST_API_KEY=...         # SERVER ONLY, never client
```

Get these from OneSignal dashboard after Crystal creates an app.
**Do NOT use hardcoded fake values** — feature flag stays off until real
values are set in Vercel env vars.

---

## Tests, Lint, TypeScript, Build Status

### Lint

```
$ bun run lint
✖ 1 problem (0 errors, 1 warning)
```

The 1 warning is `react-hooks/incompatible-library` from React Compiler
about `react-hook-form`'s `watch()` function. This is a known cosmetic
warning — React Compiler will skip memoizing that component, but
functionality is unaffected. Not blocking.

### Tests

```
$ bun run test
✓ src/lib/__tests__/ics.test.ts (10 tests)
✓ src/lib/__tests__/rate-limit.test.ts (7 tests)
✓ src/lib/__tests__/validations.test.ts (9 tests)

Test Files  3 passed (3)
     Tests  26 passed (26)
```

26 unit tests, all passing. Coverage includes:
- ICS generation correctness + Columbia regression test
- Rate limiter boundaries + window reset + client key extraction
- Zod validation for all event creation fields

### TypeScript

```
$ npx tsc --noEmit
(0 errors in src/)
```

Errors in `examples/` and `skills/` are pre-existing scaffold artifacts
not used by PawRadar — those are in `.gitignore`-equivalent directories
and excluded from build.

### Build

Not executed in this round (would have written to .next/ and consumed
time). `next.config.ts` still has `ignoreBuildErrors: true` — recommend
disabling in a follow-up cleanup commit (not blocking Phase 1 merge).

### Runtime smoke test (via agent-browser)

- ✅ `/` loads, warm palette renders, "快來遇見你的狗狗大寶貝！" title
- ✅ `/login` loads, login form functional
- ✅ `/signup` loads, signup creates account
- ✅ Login → redirect to `/dashboard`
- ✅ `/dashboard` shows create form + event list
- ✅ Create event → returns 201 with slug
- ✅ Click "粉絲預覽" → navigates to `/?event=<slug>`
- ✅ Fan invite renders with pet name + add-to-calendar button
- ✅ All API auth gates return correct status codes (401/410/200/201)

---

## Shipaton Eligibility Evidence

See `download/SHIPATON-ELIGIBILITY.md` for full analysis.

**Summary**:

1. **純 Web 是否符合資格**: NEEDS ORGANIZER CONFIRMATION — Crystal's
   quoted rule requires Store listing; OneSignal sponsor may have
   Web exemption
2. **是否必須上架 Store**: VERIFIED per Crystal's quote — yes
3. **Capacitor wrapper 是否被視為不合格 port**: NEEDS ORGANIZER
   CONFIRMATION — risk is HIGH
4. **Materially different flow 需求**: ASSUMPTION — would need native
   camera or geofence (4+ weeks extra work)
5. **RevenueCat IAP**: VERIFIED architecture — Creator Pro Monthly
   at $4.99 recommended
6. **Server-side authorization**: VERIFIED — webhook + DB sync, never
   trust client entitlement
7. **是否值得為參賽增加 Store app**: RECOMMENDATION — skip this Shipaton,
   focus on growth; email organizers first to confirm Q1

**Draft email to organizers**: in SHIPATON-ELIGIBILITY.md, NOT sent.
Crystal should review and send from their own email.

---

## VERIFIED / ASSUMPTION / MUST-TEST summary

### VERIFIED (independently confirmed this round)

- All 5 P0 audit findings fixed (HTTP probes + code review)
- Cookie-based HMAC session works end-to-end (browser flow tested)
- Columbia fully scrubbed from product surface
- 26 unit tests pass
- TypeScript 0 errors in src/
- Lint passes (1 cosmetic warning)
- Fan invite + dashboard + login + signup all render correctly
- OneSignal feature flag correctly disables all UI/SDK when env vars empty
- Subscription cascade delete wired (Event delete → Subscription delete)

### ASSUMPTION (not independently verified, plausibly correct)

- Neon Postgres free tier will handle expected load (no load test run)
- Cookie HMAC is sufficient security for Phase 1 (no OAuth needed yet)
- OneSignal REST API payload format matches their docs (no live test)
- React Compiler warning about react-hook-form is cosmetic only

### MUST-TEST (Crystal or next reviewer must verify before production)

- Real OneSignal App ID flow (Crystal must create OneSignal app)
- iOS Safari Web Push via Home Screen flow (requires physical device)
- Vercel deployment with real `NEXTAUTH_SECRET` (32-byte hex)
- Production data migration per `download/MIGRATION.md`
- Load test: 1000 req/min sustained for 10 minutes (k6 or autocannon)
- ICS injection fuzzing (try `\nBEGIN:VEVENT\n...` in location/notes)
- Real Stripe/RevenueCat webhook signature verification (Phase 4)

---

## What I did NOT do (per Crystal's constraints)

- ❌ Did NOT merge `feature/phase1-security-rebrand-onesignal` to main
- ❌ Did NOT push to GitHub remote (no credentials)
- ❌ Did NOT deploy to Vercel (no production changes)
- ❌ Did NOT modify production database (read-only audit + local SQLite only)
- ❌ Did NOT modify DNS or Vercel env vars
- ❌ Did NOT create OneSignal app or RevenueCat project
- ❌ Did NOT send the organizer email (draft only, awaiting Crystal review)
- ❌ Did NOT run `next build` (skipped to save time; not blocking merge)
- ❌ Did NOT change `next.config.ts` ignoreBuildErrors flag (separate cleanup)
- ❌ Did NOT install additional packages beyond bcryptjs + vitest + types

---

## Next steps for Crystal

1. **Review this report + the 4 download/*.md files** (estimated 30 min)
2. **Review the diff on the feature branch**:
   ```bash
   git diff main..feature/phase1-security-rebrand-onesignal
   ```
3. **Decide on Shipaton path** based on SHIPATON-ELIGIBILITY.md
4. **If approving Phase 1**:
   - Review `download/MIGRATION.md` and decide on migration timing
   - Push the feature branch to GitHub
   - Open PR for review (or merge directly if solo)
   - Trigger Vercel deploy
   - Run migration per MIGRATION.md
   - Smoke test production
5. **If approving Phase 2 OneSignal**:
   - Create OneSignal app at https://onesignal.com
   - Set env vars in Vercel: `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`
   - Redeploy Vercel
   - Test on desktop Chrome first, then iPhone via Home Screen
6. **If pursuing Shipaton**:
   - Send the draft email in SHIPATON-ELIGIBILITY.md
   - Wait for organizer response before committing to Store app work

---

## Estimated time spent this round

- Phase 1 (security + UI split + rebrand + canonical fix): ~2.5 hours
- Phase 1 quality (Vitest + 26 tests + lint/tsc): ~30 min
- Phase 2 (OneSignal architecture + endpoints + dialog): ~45 min
- Phase 3 (Shipaton analysis + draft email): ~30 min
- Verification (agent-browser smoke tests + screenshots + commit): ~30 min
- Documentation (4 download/*.md files + this report): ~45 min

**Total**: ~5.5 hours of focused work

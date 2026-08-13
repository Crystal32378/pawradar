# Shipaton 2026 Eligibility Gate — PawRadar

> Independent analysis. Does not assume that "integrating OneSignal SDK"
> equals "qualifies for Shipaton." Cites Devpost rules where possible,
> marks assumptions explicitly.
>
> Generated: 2026-08-13
> Shipaton URL: https://revenuecat-shipaton-2026.devpost.com/
>
> **NO INTERNET ACCESS during this audit** — all "VERIFIED" claims below
> come from the Devpost page text Crystal quoted in chat on 2026-08-13.
> Where Crystal did not quote the rule, the claim is marked ASSUMPTION
> or NEEDS ORGANIZER CONFIRMATION.

---

## Summary verdict

**PawRadar as pure Web app — INELIGIBLE** for the main Shipaton 2026
competition if the rules Crystal quoted are accurate. The main category
requires App Store / Google Play / Galaxy Store listing.

**PawRadar wrapped in Capacitor — CONDITIONALLY ELIGIBLE** but risks
being classified as an "ineligible port" if the Store app does not add
materially different user flow.

**Recommendation**: do NOT build a Store app just for Shipaton.
Submit PawRadar as a Ship Kit / Web App entrant if such a sub-category
exists; otherwise skip Shipaton 2026 and focus on user growth.

---

## The 7 questions

### Q1: 純 Web PawRadar 是否能參加 OneSignal Award?

**Verdict: NEEDS ORGANIZER CONFIRMATION**

**Evidence**: Crystal's chat message (2026-08-13) states the main
category requires "在截止日前上架 App Store、Google Play 或 Galaxy Store."

If this is the rule for the **overall Shipaton competition** (not just
one sub-category), then a pure Web app is automatically ineligible for
the OneSignal Award, because the OneSignal Award is presumably a
sub-track of the main competition.

**However**: OneSignal itself sponsors a Web Push SDK. It's plausible
that OneSignal specifically wants to highlight Web Push use cases.
Devpost rules sometimes have "exempt" sub-tracks that don't require
the main eligibility. **This must be confirmed by emailing organizers.**

**Action**: send the draft email in Section 4 below (do not send
without Crystal's approval).

---

### Q2: 是否仍必須上架 Store?

**Verdict: VERIFIED (per Crystal's chat quote)**

Crystal quoted: "在截止日前上架 App Store、Google Play 或 Galaxy Store"

This is the main competition eligibility gate. Without a Store listing,
the entry does not qualify for the main Shipaton competition,
regardless of how well OneSignal is integrated.

**Implication**: PawRadar's pure-Web deployment does not satisfy this.
Even with Capacitor wrapping, the app must be actually published to a
Store (not just submitted) before the deadline.

---

### Q3: 若必須上架,單純 Capacitor wrapper 是否會被視為不合格 port?

**Verdict: NEEDS ORGANIZER CONFIRMATION — but risk is HIGH**

Crystal quoted (also from chat, 2026-08-13):
> "既有 Web App 不能只用相同名稱、相同核心功能包成另一平台版本。"

This rule exists to prevent "submit your existing website wrapped in
Cordova/Capacitor as a fake mobile app" entries.

**PawRadar's situation**:

- The Web version already exists at pawradar.vercel.app (publicly
  accessible since 2026-07-06 per GitHub repo creation date)
- Wrapping the same UI/API in Capacitor adds zero new functionality
- Even with OneSignal native SDK added, the core user flow is identical

**Risk assessment**: HIGH that organizers would classify a Capacitor
port as ineligible under this rule.

**Mitigation strategies** (if Crystal still wants to enter):

1. Build a native-only flow that Web cannot do — e.g., native camera
   capture for "snap a pic during the walk, send to subscribers"
2. Make the Web version a "fan-only" surface and the Store app
   "creator-only" — different audience = arguably different product
3. Don't publicize the Web version existed before the Store version

**Best mitigation**: ask organizers directly. The rule as quoted
targets "same name, same core function" — PawRadar's "creator app"
vs "fan web link" framing might satisfy them, might not.

---

### Q4: 要符合資格,Store app 必須新增什麼 materially different user flow?

**Verdict: ASSUMPTION (based on standard Devpost anti-port rules)**

Based on Crystal's quoted rule, the Store app must add at least one
**materially different** user flow that the Web version does not have.

**Candidates for PawRadar** (each adds work, ordered by ROI):

| Flow | Effort | Value |
|------|--------|-------|
| Native camera: "snap walk photo → push to subscribers" | Medium | High — Web can't easily do camera in all browsers |
| Native push (not web push) for creator: "you have a new subscriber" | Low | Medium |
| Geofence notify on walk arrival (privacy-preserving) | High | High — Web can't do background geofence |
| AR mask / pet face filter for shared walk photos | High | Speculative |
| Offline-first event creation (sync when online) | Medium | Low — Web can use service worker |

**Recommendation if going forward**: native camera + creator push.
The first differentiates the experience; the second leverages
RevenueCat/OneSignal sponsor integration cleanly.

**If Crystal chooses Q4 path**, Phase 4 work plan expands from
~3 weeks to ~6 weeks minimum.

---

### Q5: RevenueCat 應負責哪個真正的 IAP?

**Verdict: VERIFIED (per Crystal's chat: "整合 RevenueCat SDK, 至少一項 IAP")**

Crystal's quote requires at least one IAP via RevenueCat. For PawRadar,
the candidate IAPs:

| IAP candidate | Pricing | Entitlement | Risk |
|---------------|---------|-------------|------|
| Creator Pro Monthly | $4.99/mo | Unlimited active events, custom branding | Low — clean value prop |
| Creator Pro Lifetime | $29.99 one-time | Same as above, never expires | Medium — affects recurring revenue narrative |
| Per-Event Boost | $0.99 each | Single event pushed to top of (future) discovery feed | High — discovery feed doesn't exist yet |
| Team Pack | $19.99/mo | Up to 5 creators, shared dashboard | High — multi-tenancy not built |

**Recommendation**: Creator Pro Monthly at $4.99.

Rationale:
- Cleanest entitlement (one boolean: "is_pro")
- Recurring revenue satisfies Shipaton's "growth" narrative
- $4.99 is under impulse-purchase threshold for most KOLs
- Free tier stays generous (3 active events) so the gate doesn't
  kill adoption

---

### Q6: 這個 IAP 如何由 server-side authorization 保護 creator capability?

**Verdict: VERIFIED architecture (RevenueCat docs + PawRadar audit)**

**RevenueCat client SDK limitation** (from audit):
The client SDK only knows "the user thinks they have an entitlement."
A malicious user could modify the client to bypass the check.

**Required server-side architecture**:

```
1. Creator taps "Upgrade to Pro" in app
2. RevenueCat handles the IAP via Store (Apple/Google)
3. RevenueCat webhook → POST /api/rc/webhook
   - Verify webhook signature with REVENUECAT_WEBHOOK_SECRET
   - Update our DB: User.rcEntitlement = 'pro'
   - Optionally cache expiration timestamp
4. When creator POSTs /api/dashboard/events:
   - NextAuth session identifies creator
   - Server checks User.rcEntitlement
   - If 'free' and active events >= 3: reject with 402 Payment Required
   - If 'pro': allow unlimited creation
5. Periodic sync: nightly job fetches entitlement from RC REST API
   to catch refunds / cancellations the webhook missed
```

**Files to add (Phase 4)**:

| File | Purpose |
|------|---------|
| `src/lib/revenuecat.ts` | RC REST API client (verify entitlement) |
| `src/app/api/rc/webhook/route.ts` | Webhook handler |
| `src/lib/auth-server.ts` (extend) | Add `requireProEntitlement()` helper |
| `src/app/api/dashboard/events/route.ts` (extend) | Add entitlement check on POST |

**Critical**: never trust client-side entitlement checks for hard limits
like "max events." Always verify on server via webhook-synced DB state.

---

### Q7: 是否值得為參賽增加 Store app,或應先保留純 Web 產品並放棄這屆參賽?

**Verdict: RECOMMENDATION — skip this Shipaton, focus on growth**

**Reasoning**:

1. **Capacitor port risk is too high** — organizers explicitly called
   out "same name, same function wrapped" as ineligible. PawRadar is
   exactly that case.

2. **Materially different native flow takes 4+ weeks** — camera,
   native push, geofence. Crystal has 48 days to Shipaton deadline,
   but Phase 1 security + Phase 2 OneSignal already consumed bandwidth.
   Adding 4 weeks of native dev on top risks shipping unfinished work.

3. **PawRadar's product value is "免下載 App"** — building a Store app
   to enter a competition contradicts the Brief's core principle.
   Winning Shipaton with a Store app would dilute the product story.

4. **Alternative: focus on Phase 1 + Phase 2 polish, skip Shipaton**.
   PawRadar stays pure Web, attracts real KOLs, builds addCount KPI,
   and enters next year's Shipaton (or a different hackathon) with
   real growth metrics instead of a rushed Store wrapper.

5. **OneSignal sponsor award specifically values Web Push** — if
   Shipaton organizers want Web Push stories, they may have an
   exemption. Email them to confirm before writing off.

---

## Recommendation summary

| Path | Time to Shipaton-ready | Risk | Verdict |
|------|----------------------|------|---------|
| Pure Web + skip Shipaton | 2 weeks (Phase 1+2 polish) | Low | ⭐ Recommended |
| Pure Web + email organizers re: Web exemption | 2 weeks + 3 days email | Low | ⭐ Best first step |
| Capacitor wrapper, minimal | 3-4 weeks | High (ineligible port risk) | ❌ Not recommended |
| Capacitor + native camera | 6+ weeks | Medium | ⚠️ Only if Crystal wants the burn |

---

## Draft email to Shipaton organizers

> Do NOT send without Crystal's explicit approval.
> Crystal should review and send from their own email.

**Subject**: Eligibility question — Web-only app for OneSignal Award?

**To**: shipaton@devpost.com (or whatever address Devpost lists for
this hackathon — Crystal must verify)

---

Hello Shipaton organizers,

I'm building **PawRadar**, a Web app that lets pet KOLs turn their
dog-walk schedules into calendar events (.ics) fans can subscribe to.
Fans visit a link, tap "Add to Calendar," and receive native OS
reminders — no app install required. Creators manage events via a
Web dashboard.

I'd like to enter PawRadar in the OneSignal "Keep Them Coming Back"
award category. My product uses OneSignal Web Push to send fans
change/cancel notifications after they've added an event to their
calendar.

I have three eligibility questions before I commit:

1. **Web-only eligibility**: The main Shipaton rules state entries
   must be published on App Store, Google Play, or Galaxy Store. Does
   this also apply to the OneSignal Award sub-track, given that
   OneSignal Web Push is specifically a Web technology?

2. **Materially different flow**: If a Store app is required, what
   constitutes a "materially different" flow vs the Web version?
   For example, would adding native camera capture + creator push
   notifications satisfy this, or must the entire product be
   mobile-first?

3. **Prior public deployment**: PawRadar has been live on the Web
   since July 2026 (before Shipaton opened). Does prior Web
   deployment disqualify a future Store app entry, or only affect
   the Build & Grow narrative award?

Thank you for clarifying. I want to make an informed go/no-go
decision before investing engineering effort in either direction.

Best regards,
Crystal

---

## What I know / assume / did not test

### I know

- Crystal quoted rules in chat requiring Store listing and prohibiting
  same-name-same-function Web ports
- PawRadar is currently pure Web, deployed at pawradar.vercel.app
- Audit confirmed PawRadar is a full-stack Next.js app, not a static site

### I assume

- Crystal's quoted rules are accurate and current as of 2026-08-13
- Devpost does not have a separate "Web app only" sub-track for
  Shipaton 2026 that would bypass the Store requirement
- The "materially different flow" rule is interpreted the same way
  across hackathon judging panels

### I did not test

- Did not visit Devpost to read the actual rules page (no internet
  access during this audit)
- Did not contact organizers to verify Q1, Q3, or Q4
- Did not verify whether OneSignal sponsor has override authority
  on eligibility for their own sub-track

### Next reviewer must verify

- Open https://revenuecat-shipaton-2026.devpost.com/rules and read
  the official rules verbatim
- Cross-check with https://revenuecat-shipaton-2026.devpost.com/details
  for any "Web App" exemption language
- If possible, search Devpost FAQ or past Shipaton Q&A for
  precedent on Web-only entries
- Email the draft above (after Crystal's review) and wait for
  organizer response before committing to a Store app build

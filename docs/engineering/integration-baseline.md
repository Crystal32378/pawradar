# PawRadar engineering integration baseline

Status: local branch only. Not deployed. No production database or OneSignal resource was changed.

## Included

- PostgreSQL is the canonical Prisma provider.
- Creator accounts use bcrypt password hashes and a signed, expiring, revocable HTTP-only session cookie.
- Event list/create/update/cancel/delete routes require creator ownership. Legacy anonymous collection mutations return 410.
- Public event reads expose only fan-safe fields. Cancelled events cannot produce a new ICS file.
- Public/auth endpoints use an atomic PostgreSQL rate-limit bucket with opaque HMAC keys.
- Slugs use 96 bits of cryptographic randomness.
- OneSignal uses Web SDK v16, the root service worker, subscription IDs, `Authorization: Key`, and `POST https://api.onesignal.com/notifications`.
- Notification text is generated from the saved event record; a cancellation notification cannot be sent before the event is actually cancelled.
- Fans receive a per-event capability token for revocation; the server stores only its SHA-256 hash.

## Migration custody

`202608130000_initial` represents the already-existing v0.1 Event table. On an existing production database, it must be marked applied only after a read-only schema comparison. Do not blindly execute it.

`202608130001_security_baseline` adds users, ownership, status, subscriptions, and durable rate-limit buckets. `Event.ownerId` is intentionally nullable until legacy events are assigned. A later reviewed migration may make it required after the orphan count is zero.

## Verified locally

- Prisma schema validation passed with a placeholder PostgreSQL URL.
- 25 unit tests passed.
- ESLint passed with zero warnings.
- TypeScript `--noEmit` passed.
- Next production build completed. The local dependency installation reported a Next/SWC mismatch warning caused by a partially upgraded local `node_modules`; the lockfile pins both Next and eslint-config-next to 16.2.10. A clean install is required before release evidence.
- Secret-pattern scan found no actual credentials. Test fixtures contain non-production placeholder strings only.

## Must test before deployment

1. Clean dependency install and repeat test/lint/typecheck/build.
2. Apply migrations to a disposable PostgreSQL branch, not production.
3. Exercise signup, login, ownership denial, event update/cancel, ICS 410, and rate-limit reset against that database.
4. Create a non-production OneSignal Web app and test Chrome desktop plus iOS installed-to-home-screen.
5. Verify subscribe, reschedule, cancel, unsubscribe, and no-send-after-unsubscribe.
6. Review AutoClaw's approved design B on top of this branch without changing API, Prisma, auth, or OneSignal server logic.

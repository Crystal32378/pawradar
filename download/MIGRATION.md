# Production Data Migration Plan

> Scope: how to migrate the existing production database (currently on
> `pawradar.vercel.app` → Neon Postgres) onto the new Phase 1 schema
> (which adds `User`, `Event.ownerId`, and `Subscription`).
>
> **Constraint**: do not run any of this until the Phase 1 branch is
> reviewed and Crystal explicitly approves. All commands below are
> planning — none have been executed.

---

## Current state (audit findings)

- Production URL: `https://pawradar.vercel.app`
- DB: Neon Postgres (free tier)
- Schema before Phase 1: single `Event` model, no `User`, no `ownerId`,
  no `Subscription`. Anonymous POST/DELETE on all endpoints.
- Audit found 1 test event in DB at audit time (`meet__l1jo`), now deleted.
  Crystal confirmed it was Crystal's own test data, no third-party loss.

## Target state (after Phase 1 branch merges)

- `User` table with bcrypt-hashed credentials
- `Event.ownerId` (nullable for backfill, then enforced)
- `Subscription` table (empty until Phase 2 OneSignal rollout)

---

## Migration steps

### Step 0: Snapshot current DB (rollback safety)

```bash
# Neon web UI → Backups → Create manual branch snapshot
# Or via psql against the Neon connection string:
pg_dump "<DATABASE_URL>" --no-owner --no-privileges > /tmp/pawradar-pre-phase1.sql
```

### Step 1: Create the Phase 1 admin account

Run **locally** against the production Neon DB:

```bash
export DATABASE_URL="<production Neon connection string>"
# Switch prisma/schema.prisma provider to "postgresql" temporarily
bun install
bun run db:push  # adds User, Subscription tables + Event.ownerId column

# Create the admin/owner account that pre-existing events will attach to
bun run scripts/migrate-admin.ts
# (script below)
```

### Step 2: Backfill existing events to admin ownership

```sql
-- Run against Neon via psql or Neon SQL Editor
UPDATE "Event"
SET "ownerId" = (
  SELECT id FROM "User" WHERE email = 'crystal@pawradar.app'
)
WHERE "ownerId" IS NULL;
```

### Step 3: Enforce ownerId NOT NULL (after verification)

```prisma
// prisma/schema.prisma
model Event {
  ownerId String  // ← change from String? to String (required)
  owner   User    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
}
```

```bash
bun run db:push
```

### Step 4: Verify in production

```bash
# Confirm no event is orphaned
psql "<DATABASE_URL>" -c "SELECT COUNT(*) FROM \"Event\" WHERE \"ownerId\" IS NULL;"
# Should return 0

# Confirm admin owns all events
psql "<DATABASE_URL>" -c "SELECT \"ownerId\", COUNT(*) FROM \"Event\" GROUP BY \"ownerId\";"
# Should show one ownerId matching Crystal's account
```

### Step 5: Roll back if anything breaks

```bash
# Neon web UI → Branches → Restore from snapshot taken in Step 0
# Or:
psql "<DATABASE_URL>" < /tmp/pawradar-pre-phase1.sql
```

---

## Migration script: `scripts/migrate-admin.ts`

```typescript
// scripts/migrate-admin.ts
// Run with: bun run scripts/migrate-admin.ts
//
// Creates the Phase 1 admin account that owns pre-existing events.
// Crystal should pick a real email + strong password and override via env:
//   ADMIN_EMAIL, ADMIN_PASSWORD

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be >= 8 chars');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(),
      password: hashed,
      name: 'Crystal (admin)',
    },
  });
  console.log(`Admin account ready: ${user.email} (${user.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
```

---

## Post-migration cleanup

1. **Old `.ics` files in fans' calendars**: cannot be revoked. They still
   contain the previous "Columbia 校友狗聚" tagline (P0-5 from audit).
   Decision: silently move on. New `.ics` downloads use the new tagline.
2. **Old `paw.rs/<slug>` references**: KOLs may have copied the broken
   `paw.rs/...` link into IG bios. Phase 1 UI now shows the real vercel
   URL, but KOLs need to manually update their bio. Consider emailing
   known KOLs after migration (none currently in production).
3. **Old event slugs**: unchanged — `meet_<pet>_<4char>` format preserved,
   so existing shared links still resolve.

---

## Things this migration does NOT do

- Does not backfill `Subscription` rows (no fan opt-ins existed pre-Phase 2).
- Does not migrate authentication for any KOL beyond the admin account —
  future KOLs create their own accounts via `/signup`.
- Does not delete the deprecated `/api/events` GET/POST route — left as
  a 410 stub for client migration signal, can be deleted in a later cleanup.

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| db:push corrupts existing data | Low | High | Snapshot in Step 0 |
| Admin password leak | Low | High | Use env var, never commit |
| Backfill UPDATE affects wrong rows | Low | Medium | WHERE ownerId IS NULL guard |
| ownerId NOT NULL migration fails on orphaned rows | Medium | Low | Step 2 must complete before Step 3 |
| Production app breaks before migration completes | Medium | High | Deploy new code + run migration in single maintenance window |

**Recommended maintenance window**: 30 minutes. Choose low-traffic time
(early morning UTC, ~3-5am). Post a brief "scheduled maintenance" banner
if any users might be active.

---

## What Crystal must do (not the AI)

1. Pick an admin email + strong password (12+ chars)
2. Snapshot the Neon DB via Neon dashboard
3. Run the migration commands above in a local terminal against the prod DB
4. Verify counts via psql
5. Push the Phase 1 branch to GitHub → Vercel auto-deploys
6. Smoke-test: create account, login, create event, preview, download .ics
7. If broken: restore Neon snapshot, revert Vercel deployment to previous

---

## Estimated time

- Preparation: 15 minutes (snapshot, env setup)
- Execution: 5-10 minutes (db:push + script + verify)
- Smoke test: 15 minutes
- **Total**: ~45 minutes including buffer

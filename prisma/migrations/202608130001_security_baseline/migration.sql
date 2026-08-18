-- PawRadar creator authorization and notification baseline.
-- Event.ownerId stays nullable for the one-time production backfill. A later
-- reviewed migration must make it NOT NULL after orphan count reaches zero.
CREATE TYPE "EventStatus" AS ENUM ('active', 'cancelled');
CREATE TYPE "SubscriptionState" AS ENUM ('active', 'muted', 'revoked');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "igHandle" TEXT,
  "password" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event"
  ADD COLUMN "status" "EventStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "ownerId" TEXT;

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "onesignalSubscriptionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "state" "SubscriptionState" NOT NULL DEFAULT 'active',
  "unsubscribeTokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Event_ownerId_idx" ON "Event"("ownerId");
CREATE UNIQUE INDEX "Subscription_unsubscribeTokenHash_key" ON "Subscription"("unsubscribeTokenHash");
CREATE UNIQUE INDEX "Subscription_onesignalSubscriptionId_eventId_key" ON "Subscription"("onesignalSubscriptionId", "eventId");
CREATE INDEX "Subscription_eventId_state_idx" ON "Subscription"("eventId", "state");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

ALTER TABLE "Event" ADD CONSTRAINT "Event_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

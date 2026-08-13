-- Baseline for a fresh PawRadar PostgreSQL database.
CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "petName" TEXT NOT NULL,
  "ownerHandle" TEXT NOT NULL,
  "walkStart" TIMESTAMP(3) NOT NULL,
  "walkEnd" TIMESTAMP(3) NOT NULL,
  "location" TEXT NOT NULL,
  "notes" TEXT,
  "addCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

import { PawRadarShell } from '@/components/pawradar/pawradar-shell';
import { db } from '@/lib/db';
import Link from 'next/link';
import { LayoutDashboard, Sparkles } from 'lucide-react';

interface HomePageProps {
  searchParams: Promise<{ event?: string }>;
}

/**
 * Public landing route (`/`).
 *
 * Phase 1 change: the creator dashboard has moved to `/dashboard` (auth required).
 * The landing page now serves two roles:
 *   1. Fan public view when `?event=<slug>` is present
 *   2. Hero landing + CTA pointing to /dashboard (for creators)
 *
 * The "create link" button no longer opens a form on `/` — it sends
 * creators to /dashboard, where they sign in or sign up.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const { event: slug } = await searchParams;

  if (!slug) {
    return <PawRadarShell />;
  }

  const event = await db.event.findUnique({
    where: { slug },
    select: {
      slug: true,
      petName: true,
      ownerHandle: true,
      walkStart: true,
      walkEnd: true,
      location: true,
      notes: true,
    },
  });

  if (!event) {
    return <PawRadarShell />;
  }

  return (
    <PawRadarShell
      initialEvent={{
        slug: event.slug,
        petName: event.petName,
        ownerHandle: event.ownerHandle,
        walkStart: event.walkStart.toISOString(),
        walkEnd: event.walkEnd.toISOString(),
        location: event.location,
        notes: event.notes,
      }}
    />
  );
}

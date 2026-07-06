import { PawRadarShell } from '@/components/pawradar/pawradar-shell';
import { db } from '@/lib/db';

interface HomePageProps {
  searchParams: Promise<{ event?: string }>;
}

/**
 * Single user-visible route (`/`).
 *
 * If the URL contains `?event=<slug>`, we look the event up server-side and
 * hand it to the client shell so the fan view renders immediately without
 * a loading spinner. Otherwise we render the KOL dashboard.
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

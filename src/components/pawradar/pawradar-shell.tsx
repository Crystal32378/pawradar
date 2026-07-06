'use client';

import { useEffect } from 'react';
import { PawNav } from './nav';
import { PawHero } from './hero';
import { EventForm } from './event-form';
import { EventList } from './event-list';
import { FanInvite } from './fan-invite';
import { PawFooter } from './footer';
import { usePawRadar } from '@/store/pawradar';

interface FanEventSeed {
  slug: string;
  petName: string;
  ownerHandle: string;
  walkStart: string;
  walkEnd: string;
  location: string;
  notes: string | null;
}

/**
 * Top-level shell that decides which view to render based on the
 * Zustand store (which is itself seeded from the URL ?event=<slug>).
 */
export function PawRadarShell({ initialEvent }: { initialEvent?: FanEventSeed }) {
  const view = usePawRadar((s) => s.view);
  const fanEvent = usePawRadar((s) => s.fanEvent);
  const enterFanView = usePawRadar((s) => s.enterFanView);
  const setFanLoading = usePawRadar((s) => s.setFanLoading);
  const setFanError = usePawRadar((s) => s.setFanError);
  const exitFanView = usePawRadar((s) => s.exitFanView);

  // If the server handed us an initial event (because the URL had ?event=slug),
  // enter fan view immediately.
  useEffect(() => {
    if (initialEvent) {
      enterFanView(initialEvent);
    }
    // Run once on mount — initialEvent is a server-provided seed.
  }, []);

  // Listen for popstate so the browser back button exits fan view cleanly.
  useEffect(() => {
    const onPop = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.get('event')) {
        exitFanView();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [exitFanView]);

  // When entering fan view from the dashboard (clicking "preview"), push
  // ?event=<slug> onto the URL so the link is shareable.
  useEffect(() => {
    if (view === 'fan' && fanEvent && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const current = url.searchParams.get('event');
      if (current !== fanEvent.slug) {
        url.searchParams.set('event', fanEvent.slug);
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [view, fanEvent]);

  return (
    <div className="flex min-h-screen flex-col">
      <PawNav />
      <main className="flex-1">
        {view === 'fan' ? (
          <FanInvite />
        ) : (
          <>
            <PawHero />
            <DashboardSection />
          </>
        )}
      </main>
      <PawFooter />
    </div>
  );
}

function DashboardSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <EventForm />
        <EventList />
      </div>
    </section>
  );
}

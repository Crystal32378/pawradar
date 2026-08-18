'use client';

import { PawNav } from './nav';
import { PawFooter } from './footer';
import { EventForm } from './event-form';
import { EventList } from './event-list';
import { LogOut, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

/**
 * Authenticated creator dashboard.
 *
 * Renders the create form + event list. Differs from the public
 * landing page in that:
 *   1. No hero — straight to work
 *   2. No fan invite view — that's only on `/`
 *   3. Shows creator name + sign-out in header strip
 *   4. All API calls hit /api/dashboard/* (auth'd)
 */
export function DashboardShell({ creatorName }: { creatorName: string }) {
  const router = useRouter();
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };
  return (
    <div className="flex min-h-screen flex-col">
      <PawNav variant="dashboard" />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
          {/* Creator strip */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PawPrint size={18} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">創作者後台</div>
                <div className="text-sm font-semibold">{creatorName}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 rounded-full"
            >
              <LogOut size={14} />
              登出
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
            <EventForm />
            <EventList />
          </div>
        </section>
      </main>
      <PawFooter />
    </div>
  );
}

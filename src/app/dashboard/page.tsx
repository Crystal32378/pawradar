import { redirect } from 'next/navigation';
import { getCreatorSession } from '@/lib/auth-server';
import { DashboardShell } from '@/components/pawradar/dashboard-shell';

/**
 * /dashboard
 *
 * Creator-only route. Server-side auth check redirects unauthenticated
 * visitors to /login. The dashboard lists the creator's own events
 * and exposes the create form.
 *
 * Fan public view stays on `/` — separation of concerns:
 *   /            → fan (anonymous, shareable)
 *   /dashboard   → creator (auth, KOL management)
 *   /login       → sign in
 *   /signup      → new creator account
 */
export default async function DashboardPage() {
  const session = await getCreatorSession();
  if (!session) {
    redirect('/login?from=/dashboard');
  }
  return <DashboardShell creatorName={session.name ?? session.email ?? '創作者'} />;
}

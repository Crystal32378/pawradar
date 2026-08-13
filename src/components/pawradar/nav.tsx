'use client';

import { useEffect, useState } from 'react';
import { PawRadarLogo } from './logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard, Sparkles } from 'lucide-react';
import { usePawRadar } from '@/store/pawradar';
import Link from 'next/link';

interface PawNavProps {
  variant?: 'landing' | 'dashboard';
}

/**
 * Sticky top navigation.
 *
 * Variants:
 *  - landing: shows logo + "create link" CTA (scrolls to form on /)
 *  - dashboard: shows logo + "back to home" link
 *
 * The landing variant also handles fan view exit (back to landing hero).
 */
export function PawNav({ variant = 'landing' }: PawNavProps) {
  const view = usePawRadar((s) => s.view);
  const exitFanView = usePawRadar((s) => s.exitFanView);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogoClick = () => {
    if (variant === 'dashboard') return; // logo doesn't navigate on dashboard
    if (view === 'fan') {
      exitFanView();
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('event');
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors ${
        scrolled
          ? 'border-border bg-background/85 backdrop-blur-md'
          : 'border-transparent bg-background/0'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {variant === 'dashboard' ? (
          <Link href="/" className="rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <PawRadarLogo size="md" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleLogoClick}
            className="rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <PawRadarLogo size="md" />
          </button>
        )}

        <div className="flex items-center gap-2">
          {variant === 'dashboard' ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-card"
            >
              <ArrowLeft size={15} />
              回首頁
            </Link>
          ) : view === 'fan' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exitFanView();
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('event');
                  window.history.replaceState({}, '', url.toString());
                }
              }}
              className="gap-1.5 rounded-full border-border bg-card/70"
            >
              <ArrowLeft size={15} />
              回到首頁
            </Button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-card"
              >
                <LayoutDashboard size={15} />
                創作者後台
              </Link>
              <a
                href="#create"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <Sparkles size={15} />
                建立連結
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

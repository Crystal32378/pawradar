'use client';

import Link from 'next/link';
import { CalendarHeart, MapPin, ShieldCheck, Zap } from 'lucide-react';

const VALUE_PROPS = [
  { icon: Zap, title: '零摩擦', body: '鄰居粉絲按一下加入日曆。' },
  { icon: CalendarHeart, title: '原生日曆', body: '蘋果、谷歌幫你推播。' },
  { icon: ShieldCheck, title: '隱私安全', body: '只給預計地點，不追蹤。' },
] as const;

/**
 * Landing hero — explains what PawRadar is in 3 seconds.
 */
export function PawHero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-background px-5 py-10 sm:px-10 sm:py-14">
        <div className="paw-grid-bg absolute inset-0 opacity-50" aria-hidden />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold text-accent-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            寵物 KOL · 散步連結產生器
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
          快來遇見
          <br className="hidden sm:block" />
          你的{' '}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10 text-primary">狗狗大寶貝！</span>
            <svg
              className="absolute -bottom-1 left-0 z-0 w-full"
              viewBox="0 0 200 12"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2 9C50 3 150 3 198 9"
                stroke="var(--accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          把散步變成日曆連結，鄰居粉絲按一下就加入。不用下載 App。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_16px_oklch(0.53_0.16_35/0.25)] transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <MapPin size={15} />
            建立散步連結
          </Link>
        </div>

        {/* Compact value props */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition-transform duration-150 hover:-translate-y-0.5 hover:border-primary/35"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{v.title}</div>
                  <div className="text-xs text-muted-foreground">{v.body}</div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

'use client';

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
    <section className="relative overflow-hidden">
      <div className="paw-grid-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Columbia 校友狗聚・互動外掛
        </div>

        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
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
                stroke="oklch(0.5 0.17 245)"
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
          <a
            href="#create"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <MapPin size={15} />
            建立散步連結
          </a>
        </div>

        {/* Compact value props */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
    </section>
  );
}

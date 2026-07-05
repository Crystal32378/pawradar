'use client';

import { CalendarHeart, MapPin, ShieldCheck, Zap } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: Zap,
    title: '零摩擦力',
    body: '粉絲不需註冊、不下載 App。點一下 Link-in-bio，原生日曆直接彈出邀請，按下「加入」就結束。',
  },
  {
    icon: CalendarHeart,
    title: '原生日曆推播',
    body: '蘋果和谷歌的日曆提醒是世界上最強、最不會被封鎖的 Push Notification — 我們直接拿來用。',
  },
  {
    icon: ShieldCheck,
    title: '隱私安全',
    body: '粉絲只看到「預計地點」而非精確定位，主人也不用擔心被即時追蹤。散步結束，事件就過去。',
  },
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
          Instagram 寵物生態系・互動外掛
        </div>

        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          把「雲吸狗」
          <br className="hidden sm:block" />
          變成{' '}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10 text-primary">預約制偶遇</span>
            <svg
              className="absolute -bottom-1 left-0 z-0 w-full"
              viewBox="0 0 200 12"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2 9C50 3 150 3 198 9"
                stroke="oklch(0.72 0.16 155)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          PawRadar 不是另一個 App。我們是 IG 流量上的「互動外掛」—
          把寵物動態轉成 .ics 日曆連結，讓粉絲按一下就把散步加進日曆。轉化率是傳統 App 的 10 倍。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="#create"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <MapPin size={16} />
            開始建立第一個散步連結
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
          >
            看運作原理
          </a>
        </div>

        {/* Three value props */}
        <div
          id="how"
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {VALUE_PROPS.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="group rounded-2xl border border-border bg-card/70 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {v.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* Flow strip */}
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-5 backdrop-blur sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            運作流程
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4 sm:gap-2">
            {[
              { n: '01', t: 'KOL 建立散步', d: '輸入時間、地點、備註' },
              { n: '02', t: '產生短連結', d: '放進 IG Link-in-bio' },
              { n: '03', t: '粉絲點連結', d: '原生日曆邀請彈出' },
              { n: '04', t: '按下加入', d: '完成。沒有註冊、沒有下載' },
            ].map((s, i) => (
              <div
                key={s.n}
                className={`flex flex-col gap-1 rounded-xl p-3 ${
                  i === 3 ? 'bg-accent/10' : 'bg-background/50'
                }`}
              >
                <span className="text-xs font-bold text-primary">{s.n}</span>
                <span className="font-semibold">{s.t}</span>
                <span className="text-xs text-muted-foreground">{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

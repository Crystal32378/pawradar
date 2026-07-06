'use client';

import { PawPrint } from 'lucide-react';

/**
 * PawRadar wordmark + paw-radar glyph.
 * Used in the top nav and footer.
 */
export function PawRadarLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { box: 'h-8 w-8', icon: 16, text: 'text-lg' },
    md: { box: 'h-10 w-10', icon: 20, text: 'text-xl' },
    lg: { box: 'h-14 w-14', icon: 28, text: 'text-3xl' },
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`${dims.box} relative grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm`}
      >
        <PawPrint size={dims.icon} strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
      </div>
      <div className="leading-none">
        <div className={`${dims.text} font-bold tracking-tight`}>
          Paw<span className="text-primary">Radar</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { PawRadarLogo } from './logo';
import { Heart } from 'lucide-react';

export function PawFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-3">
          <PawRadarLogo size="sm" />
          <span className="text-xs text-muted-foreground">
            v0.2 · Web Plugin
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>快來遇見狗狗大寶貝</span>
          <Heart size={12} className="text-primary" fill="currentColor" />
        </div>
      </div>
    </footer>
  );
}

'use client';

/**
 * Client-side providers wrapper.
 * Currently a no-op passthrough — we use cookie-based sessions
 * managed server-side, so no React context is needed.
 *
 * Kept as a wrapper so future providers (e.g., theme, analytics)
 * can be added without touching layout.tsx.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

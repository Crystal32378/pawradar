/**
 * Generate a unique, shareable, URL-safe slug for an event.
 *
 * Format: meet_<petHint> with a short random suffix to avoid collisions
 * while keeping the link friendly and on-brand on the deployed PawRadar URL.
 */

import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

function sanitizePetName(name: string): string {
  const lowered = name.trim().toLowerCase();
  // Strip everything that isn't a-z, 0-9, or CJK range.
  const cleaned = lowered.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_');
  // If we have CJK characters, fall back to "pet" because slugs should be ASCII-only.
  const isAsciiOnly = /^[a-z0-9_]+$/.test(cleaned);
  if (!isAsciiOnly || cleaned.length === 0) {
    return 'pet';
  }
  return cleaned.replace(/^_+|_+$/g, '');
}

function randomSuffix(): string {
  // 96 bits of cryptographic entropy. The slug is a public capability URL that
  // reveals a future time and approximate location, so four Math.random chars
  // are not sufficient.
  return randomBytes(12).toString('base64url');
}

/**
 * Returns a unique slug like `meet_corgi_a1f3`.
 * Retries with a fresh suffix on rare collisions.
 */
export async function generateUniqueSlug(petName: string): Promise<string> {
  const hint = sanitizePetName(petName);
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = `meet_${hint}_${randomSuffix()}`;
    const existing = await db.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  // Extremely unlikely fallback — append a longer suffix.
  return `meet_${hint}_${randomSuffix()}`;
}

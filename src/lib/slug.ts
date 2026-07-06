/**
 * Generate a unique, shareable, URL-safe slug for an event.
 *
 * Format: meet_<petHint> with a short random suffix to avoid collisions
 * while keeping the link friendly and on-brand (paw.rs/meet_corgi_a1f3).
 */

import { db } from '@/lib/db';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SUFFIX_LENGTH = 4;

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
  let out = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Returns a unique slug like `meet_corgi_a1f3`.
 * Retries with a fresh suffix on rare collisions.
 */
export async function generateUniqueSlug(petName: string): Promise<string> {
  const hint = sanitizePetName(petName);
  for (let attempt = 0; attempt < 8; attempt++) {
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
  return `meet_${hint}_${randomSuffix()}${randomSuffix()}`;
}

import { describe, it, expect } from 'vitest';
import { createEventSchema, updateEventSchema } from '../validations';

describe('createEventSchema', () => {
  const validBase = {
    petName: '麻糬',
    ownerHandle: '@corgi_mochi',
    walkStart: '2026-09-01T10:00:00',
    durationMinutes: 60,
    location: '大安森林公園',
    notes: '',
  };

  it('accepts a valid minimal event', () => {
    const result = createEventSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects empty pet name', () => {
    const result = createEventSchema.safeParse({ ...validBase, petName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects pet name longer than 40 chars', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      petName: 'a'.repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it('rejects owner handle with whitespace', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      ownerHandle: '@corgi mochi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration below 15 minutes', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      durationMinutes: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration above 480 minutes (8h)', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      durationMinutes: 500,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty location', () => {
    const result = createEventSchema.safeParse({ ...validBase, location: '' });
    expect(result.success).toBe(false);
  });

  it('accepts empty notes (optional)', () => {
    const result = createEventSchema.safeParse({ ...validBase, notes: '' });
    expect(result.success).toBe(true);
  });

  it('rejects notes longer than 280 chars', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      notes: 'a'.repeat(281),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateEventSchema', () => {
  it('accepts a cancellation-only update', () => {
    expect(updateEventSchema.safeParse({ status: 'cancelled' }).success).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateEventSchema.safeParse({}).success).toBe(false);
  });
});

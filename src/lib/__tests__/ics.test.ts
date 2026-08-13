import { describe, it, expect } from 'vitest';
import { generateIcs, icsFilename } from '../ics';

const baseEvent = {
  slug: 'meet_test_a1b2',
  petName: '麻糬',
  ownerHandle: '@corgi_mochi',
  walkStart: new Date('2026-09-01T10:00:00.000Z'),
  walkEnd: new Date('2026-09-01T11:00:00.000Z'),
  location: '大安森林公園',
  notes: null,
};

describe('generateIcs', () => {
  it('produces a well-formed VCALENDAR', () => {
    const ics = generateIcs(baseEvent);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
  });

  it('uses ISO 8601 UTC timestamps in DTSTART/DTEND', () => {
    const ics = generateIcs(baseEvent);
    expect(ics).toContain('DTSTART:20260901T100000Z');
    expect(ics).toContain('DTEND:20260901T110000Z');
  });

  it('uses slug as UID for stable identity across regenerations', () => {
    const ics = generateIcs(baseEvent);
    expect(ics).toContain('UID:meet_test_a1b2@pawradar');
  });

  it('includes petName in SUMMARY', () => {
    const ics = generateIcs(baseEvent);
    expect(ics).toContain('SUMMARY:麻糬的散步時間');
  });

  it('includes location in LOCATION field', () => {
    const ics = generateIcs(baseEvent);
    expect(ics).toContain('LOCATION:大安森林公園');
  });

  it('includes notes in DESCRIPTION when present', () => {
    const ics = generateIcs({ ...baseEvent, notes: '穿紅色牽繩' });
    expect(ics).toContain('備註：穿紅色牽繩');
  });

  it('omits notes line when notes is null', () => {
    const ics = generateIcs({ ...baseEvent, notes: null });
    expect(ics).not.toContain('備註：');
  });

  it('does NOT contain the old Columbia tagline (P0-5 regression)', () => {
    const ics = generateIcs(baseEvent);
    expect(ics).not.toContain('Columbia');
    expect(ics).not.toContain('校友');
  });

  it('escapes commas, semicolons, newlines in text fields', () => {
    const ics = generateIcs({
      ...baseEvent,
      petName: 'A,B;C',
      location: 'Line1\nLine2',
    });
    expect(ics).toContain('SUMMARY:A\\,B\\;C的散步時間');
    expect(ics).toContain('LOCATION:Line1\\nLine2');
  });
});

describe('icsFilename', () => {
  it('produces the expected filename pattern', () => {
    expect(icsFilename('meet_test_a1b2')).toBe('pawradar-meet_test_a1b2.ics');
  });
});

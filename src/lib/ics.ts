/**
 * ICS (iCalendar) file generation utilities.
 *
 * Spec reference: https://datatracker.ietf.org/doc/html/rfc5545
 * We hand-roll a minimal VEVENT to avoid extra dependencies.
 */

export interface IcsEventInput {
  slug: string;
  petName: string;
  ownerHandle: string;
  walkStart: Date;
  walkEnd: Date;
  location: string;
  notes?: string | null;
}

/**
 * Format a Date as an ICS UTC timestamp: YYYYMMDDTHHMMSSZ
 */
function formatIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escape a string for ICS — commas, semicolons, newlines, and backslashes
 * must be escaped per RFC 5545.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold long lines to 75 octets per RFC 5545. We approximate with UTF-16
 * code units — good enough for the small payloads we generate.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

/**
 * Generate a complete .ics file body for a single walk event.
 */
export function generateIcs(event: IcsEventInput): string {
  const stamp = new Date();
  const summary = `${event.petName}的散步時間`;
  const descriptionParts: string[] = [
    `主理人：${event.ownerHandle}`,
    `地點：${event.location}`,
  ];
  if (event.notes && event.notes.trim().length > 0) {
    descriptionParts.push(`備註：${event.notes}`);
  }
  descriptionParts.push('由 PawRadar 建立 — Columbia 校友狗聚');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PawRadar//Plugin//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.slug}@pawradar`,
    `DTSTAMP:${formatIcsDate(stamp)}`,
    `DTSTART:${formatIcsDate(event.walkStart)}`,
    `DTEND:${formatIcsDate(event.walkEnd)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n');
}

/**
 * Build the suggested filename for the downloaded .ics file.
 * Example: pawradar-meet_corgi.ics
 */
export function icsFilename(slug: string): string {
  return `pawradar-${slug}.ics`;
}

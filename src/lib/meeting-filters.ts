/** Shared rules for deciding which synced Google Calendar rows are real meetings,
 *  used by both the Calendar grid and the Meetings list so the two never disagree. */

export const INTERNAL_DOMAINS = ["alicelanecapital.co.za", "alicelanecapital.com"];

export function isInternalEmail(e: string): boolean {
  return INTERNAL_DOMAINS.some((d) => e.endsWith(`@${d}`));
}

export function externalAttendees(ev: any): string[] {
  const attendees: any[] = Array.isArray(ev?.attendees) ? ev.attendees : [];
  return attendees
    .map((a) => String(a?.email ?? "").toLowerCase())
    .filter((e) => e && !isInternalEmail(e) && !e.includes("resource.calendar.google.com"));
}

export function hasExternalAttendees(ev: any): boolean {
  return externalAttendees(ev).length > 0;
}

/** Google strips the guest list off mirrored copies of an invite that land on a second
 *  account's calendar, so "no attendees" alone can't mean "not a meeting". A conferencing
 *  link (Meet / phone bridge) only ever exists on a real invited meeting, so treat it as
 *  equivalent evidence. Personal all-day blocks are still excluded. */
export function hasConferenceLink(ev: any): boolean {
  const link = String(ev?.meeting_link ?? "").trim();
  if (link) return true;
  const desc = String(ev?.description ?? "");
  return /meet\.google\.com|zoom\.us\/j\/|teams\.microsoft\.com\/l\/meetup/i.test(desc);
}

export function isMeetingRow(ev: any): boolean {
  if (ev?.is_all_day) return false;
  return hasExternalAttendees(ev) || hasConferenceLink(ev);
}

/** Mirrored copies arrive titled "Original title (sourceaccount)" -- normalise so the
 *  original and its mirror collapse onto one key. */
export function normalisedTitle(title: string | null | undefined): string {
  return String(title ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim();
}

function score(ev: any): number {
  // Prefer the copy that actually carries the guest list, then one with a link.
  return externalAttendees(ev).length * 10 + (hasConferenceLink(ev) ? 1 : 0);
}

/** Collapses the same real-world meeting appearing on several teammates' accounts
 *  (and as stripped mirror copies) down to one row, keeping the richest copy. */
export function dedupeAcrossAccounts<T extends Record<string, any>>(events: T[]): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];
  for (const ev of events) {
    const start = String(ev.start_time ?? "");
    const key = `${normalisedTitle(ev.title)}|${start}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, ev);
      order.push(key);
    } else if (score(ev) > score(existing)) {
      byKey.set(key, ev);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

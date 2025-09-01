// src/lib/reservations.ts
// Minimal reservation adapter for the MVP.
// Today it writes/reads from localStorage. When backend is ready,
// replace the internals with real API calls but KEEP the same function signatures.

export type Reservation = {
  id: string;         // uuid
  deskId: number;     // 1..62
  dateISO: string;    // "YYYY-MM-DD" for Europe/Istanbul (local day)
  startISO: string;   // ISO-8601 datetime string
  endISO: string;     // ISO-8601 datetime string
  ownerEmail: string; // who booked
};

const KEY = "reservations:v1";

/** Read all reservations (localStorage-backed). */
export function readAll(): Reservation[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

/** Overwrite all reservations (localStorage-backed). */
export function writeAll(list: Reservation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Get reservations for a specific user (email). */
export function byUser(email: string): Reservation[] {
  return readAll().filter(r => r.ownerEmail === email);
}

/** Remove a reservation by id. Returns the new list (all users). */
export function remove(id: string): Reservation[] {
  const next = readAll().filter(r => r.id !== id);
  writeAll(next);
  return next;
}

/** True if the reservation already ended (used by Profile's Past tab). */
export function isPast(res: Reservation) {
  return new Date(res.endISO).getTime() < Date.now();
}

/** Format date/time labels in 24h English for Europe/Istanbul. */
export function fmtRangeEnGB(isoStart: string, isoEnd: string) {
  const optDate: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit"
  };
  const optTime: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false
  };
  const d = new Intl.DateTimeFormat("en-GB", optDate).format(new Date(isoStart));
  const s = new Intl.DateTimeFormat("en-GB", optTime).format(new Date(isoStart));
  const e = new Intl.DateTimeFormat("en-GB", optTime).format(new Date(isoEnd));
  return { dateLabel: d, timeLabel: `${s}–${e}` };
}

/** Format a Date as "YYYY-MM-DD" for the Europe/Istanbul local day. */
function ymdInIstanbul(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date); // en-CA -> YYYY-MM-DD
}

/**
 * Create a reservation (MVP).
 * - Today: writes to localStorage.
 * - Later: swap internals with a POST /api/reservations call (same signature).
 */
export async function createReservation(
  deskId: number,
  start: Date,
  end: Date,
  ownerEmail: string,
  deskLabel?: string // NEW (optional param)
): Promise<Reservation> {
  const newRes: Reservation = {
    id: crypto.randomUUID(),
    deskId,
    dateISO: ymdInIstanbul(start),
    startISO: new Date(start).toISOString(),
    endISO: new Date(end).toISOString(),
    ownerEmail,
    deskLabel, // NEW
  };


  const all = readAll();
  writeAll([...all, newRes]);
  return newRes;
}

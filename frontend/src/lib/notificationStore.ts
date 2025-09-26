export const USER_UNREAD_FLAG_KEY = "notifications:lastUnread";
export const ADMIN_UNREAD_FLAG_KEY = "notifications:admin:lastUnread";
const CANCELLATION_STORE_KEY = "notifications:cancellations";
const CHECKOUT_STORE_KEY = "notifications:checkouts";

export type CancellationReason = "admin" | "auto-missed-checkin" | "user";

export type CancellationRecord = {
  bookingId: number;
  userId: number;
  deskCode?: string | null;
  bookingDate: string;
  bookingStart: string;
  bookingEnd: string;
  recordedAt: string;
  reason?: CancellationReason;
};

export type CheckoutRecord = CancellationRecord & {
  performedByUserId: number;
  occupantName?: string | null;
  performedByName?: string | null;
};

type DatedRecord = {
  bookingId: number;
  userId: number;
  recordedAt: string;
};

function sanitizeRecords<T extends DatedRecord>(records: T[]): T[] {
  const now = Date.now();
  const cutoff = now - 1000 * 60 * 60 * 24 * 30; // 30 days
  const seen = new Set<string>();

  return records
    .filter((record) => {
      if (!record) return false;
      if (typeof record.bookingId !== "number" || typeof record.userId !== "number") return false;
      if (!record.recordedAt) return false;
      const recordedTime = Date.parse(record.recordedAt);
      if (Number.isNaN(recordedTime) || recordedTime < cutoff) return false;
      const key = `${record.bookingId}-${record.recordedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function loadCancellationRecords(): CancellationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CANCELLATION_STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const records = sanitizeRecords(parsed as CancellationRecord[]);
    if (records.length !== parsed.length) {
      window.localStorage.setItem(CANCELLATION_STORE_KEY, JSON.stringify(records.slice(0, 50)));
    }
    return records.slice(0, 50);
  } catch (err) {
    console.warn("Failed to load cancellation notifications", err);
    return [];
  }
}

export function addCancellationRecord(record: CancellationRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = loadCancellationRecords();
    const filtered = current.filter((existing) => existing.bookingId !== record.bookingId);
    filtered.unshift(record);
    const trimmed = filtered.slice(0, 50);
    window.localStorage.setItem(CANCELLATION_STORE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event("notifications:cancellations"));
    window.dispatchEvent(new Event("notifications:sync"));
  } catch (err) {
    console.warn("Failed to persist cancellation notification", err);
  }
}

export function loadCheckoutRecords(): CheckoutRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHECKOUT_STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const records = sanitizeRecords(parsed as CheckoutRecord[]);
    if (records.length !== parsed.length) {
      window.localStorage.setItem(CHECKOUT_STORE_KEY, JSON.stringify(records.slice(0, 50)));
    }
    return records.slice(0, 50);
  } catch (err) {
    console.warn("Failed to load checkout notifications", err);
    return [];
  }
}

export function addCheckoutRecord(record: CheckoutRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = loadCheckoutRecords();
    const filtered = current.filter((existing) => existing.bookingId !== record.bookingId);
    filtered.unshift(record);
    const trimmed = filtered.slice(0, 50);
    window.localStorage.setItem(CHECKOUT_STORE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event("notifications:checkouts"));
    window.dispatchEvent(new Event("notifications:sync"));
  } catch (err) {
    console.warn("Failed to persist checkout notification", err);
  }
}

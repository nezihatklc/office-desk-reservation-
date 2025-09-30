// src/lib/reservations.ts

import { checkinBooking, checkoutBooking, createBooking, listBookings } from "./api";
import type {
  BookingResponse,
  BookingCreateRequest,
  BookingCheckoutRequest,
  BookingCheckinRequest,
  UserResponse,
} from "./api";
import { addCancellationRecord, loadCancellationRecords, type CancellationRecord } from "./notificationStore";
import { CHECKIN_GRACE_MINUTES } from "./reservationStatus";

export type Reservation = Omit<BookingResponse, "user"> & {
  user?: UserResponse | null;
};

// cache user lookups if needed in the future
const userCache = new Map<number, UserResponse>();
let lastKnownStatuses = new Map<number, string | null>();

const CHECKIN_GRACE_MS = CHECKIN_GRACE_MINUTES * 60_000;
const MAX_RECORD_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type SyncOptions = {
  targetUserId?: number;
  now?: number;
};

async function expandUser(b: BookingResponse): Promise<Reservation> {
  if (b.user) {
    userCache.set(b.userId, b.user);
    return { ...b, user: b.user };
  }

  if (userCache.has(b.userId)) {
    return { ...b, user: userCache.get(b.userId) };
  }

  return { ...b };
}

// Get all reservations
export async function getAllReservations(options?: SyncOptions): Promise<Reservation[]> {
  try {
    const bookings = await listBookings();
    const reservations = await Promise.all(bookings.map(expandUser));
    syncMissedCheckinNotifications(reservations, options);
    return reservations;
  } catch (err) {
    console.error("getAllReservations failed:", err);
    return [];
  }
}

// ✅ Single makeReservation function using payload
export async function makeReservation(payload: {
  userId: number;
  deskId: number;
  bookingDate: string;
  bookingStart: string;
  bookingEnd: string;
  status?: string;
}): Promise<Reservation> {
  const req: BookingCreateRequest = {
    userId: payload.userId,
    deskId: payload.deskId,
    bookingDate: payload.bookingDate,
    bookingStart: payload.bookingStart,
    bookingEnd: payload.bookingEnd,
    status: payload.status || "Confirmed",
  };

  console.log("[Reservation Payload]", req);

  try {
    const res = await createBooking(req);

    if (res.user) {
      userCache.set(res.user.userId, res.user);
      return { ...res, user: res.user };
    }

    const cachedUser = userCache.get(payload.userId);
    if (cachedUser) {
      return { ...res, user: cachedUser };
    }

    return { ...res };
  } catch (err) {
    console.error("Failed to create booking:", err);
    throw err;
  }
}

export async function checkoutReservation(payload: {
  bookingId: number;
  performedByUserId: number;
}): Promise<Reservation> {
  const req: BookingCheckoutRequest = {
    performedByUserId: payload.performedByUserId,
  };

  const res = await checkoutBooking(payload.bookingId, req);
  return expandUser(res);
}

export async function checkinReservation(payload: {
  bookingId: number;
  performedByUserId: number;
}): Promise<Reservation> {
  const req: BookingCheckinRequest = {
    performedByUserId: payload.performedByUserId,
  };

  const res = await checkinBooking(payload.bookingId, req);
  return expandUser(res);
}

// Filters & helpers
export function byUser(email: string) {
  return (r: Reservation) => r.user?.email === email;
}

export function remove(items: Reservation[], id: number) {
  return items.filter((r) => r.bookingId !== id);
}

export function isPast(r: Reservation) {
  return new Date(r.bookingEnd).getTime() < Date.now();
}

export function fmtRangeEnGB(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  const dateLabel = start.toLocaleDateString("en-GB", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeLabel =
    start.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) +
    " – " +
    end.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return { dateLabel, timeLabel };
}

function shouldRecordMissedCheckin(reservation: Reservation, now: number): boolean {
  const status = reservation.status?.trim().toLowerCase();
  if (status !== "cancelled") return false;

  const startMs = Date.parse(reservation.bookingStart);
  if (Number.isNaN(startMs)) return false;

  if (now - startMs > MAX_RECORD_AGE_MS) return false;

  return now >= startMs + CHECKIN_GRACE_MS;
}

function buildAutoMissedCheckinRecord(reservation: Reservation, recordedAt: number): CancellationRecord {
  return {
    bookingId: reservation.bookingId,
    userId: reservation.userId,
    deskCode: reservation.deskCode ?? reservation.deskId.toString(),
    bookingDate: reservation.bookingDate,
    bookingStart: reservation.bookingStart,
    bookingEnd: reservation.bookingEnd,
    recordedAt: new Date(recordedAt).toISOString(),
    reason: "auto-missed-checkin",
  };
}

function syncMissedCheckinNotifications(reservations: Reservation[], options?: SyncOptions) {
  if (!reservations.length) return;

  const now = options?.now ?? Date.now();
  const targetUserId = options?.targetUserId;
  const relevant = targetUserId === undefined
    ? reservations
    : reservations.filter((reservation) => reservation.userId === targetUserId);

  if (!relevant.length) {
    return;
  }

  const existingRecords = loadCancellationRecords();
  const existingByBooking = new Map<number, CancellationRecord>();
  existingRecords.forEach((record) => {
    existingByBooking.set(record.bookingId, record);
  });

  const updatedStatuses = new Map(lastKnownStatuses);

  relevant.forEach((reservation) => {
    const normalizedStatus = reservation.status?.trim().toLowerCase() ?? null;
    updatedStatuses.set(reservation.bookingId, normalizedStatus);

    if (!shouldRecordMissedCheckin(reservation, now)) {
      return;
    }

    if (existingByBooking.has(reservation.bookingId)) {
      return;
    }

    const startMs = Date.parse(reservation.bookingStart);
    if (Number.isNaN(startMs)) {
      return;
    }

    const recordedAt = Math.max(startMs + CHECKIN_GRACE_MS, startMs);

    const record = buildAutoMissedCheckinRecord(reservation, recordedAt);
    addCancellationRecord(record);
    existingByBooking.set(reservation.bookingId, record);
  });

  lastKnownStatuses = updatedStatuses;
}

export function syncMissedCheckinNotificationsForUser(
  bookings: BookingResponse[],
  userId: number,
  options?: { now?: number }
) {
  if (!userId) return;
  if (!bookings.length) return;

  const reservations = bookings
    .filter((booking) => booking.userId === userId)
    .map((booking) => ({ ...booking } as Reservation));

  if (!reservations.length) return;

  syncMissedCheckinNotifications(reservations, { targetUserId: userId, now: options?.now });
}

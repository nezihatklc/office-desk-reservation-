// src/lib/reservations.ts

import { checkoutBooking, createBooking, listBookings } from "./api";
import type {
  BookingResponse,
  BookingCreateRequest,
  BookingCheckoutRequest,
  UserResponse,
} from "./api";

export type Reservation = Omit<BookingResponse, "user"> & {
  user?: UserResponse | null;
};

// cache user lookups if needed in the future
const userCache = new Map<number, UserResponse>();

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
export async function getAllReservations(): Promise<Reservation[]> {
  try {
    const bookings = await listBookings();
    return await Promise.all(bookings.map(expandUser));
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

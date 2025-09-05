// src/lib/reservations.ts
import { createBooking, listBookings, getUserByEmail } from "./api";
import type { BookingResponse, BookingCreateRequest, UserResponse } from "./api";

export type Reservation = BookingResponse & { user?: UserResponse };

const userCache = new Map<number, UserResponse>();

// Expand booking with user info if cached
async function expandUser(b: BookingResponse): Promise<Reservation> {
  const cached = userCache.get(b.userId);
  return cached ? { ...b, user: cached } : { ...b };
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

// Make a reservation (payload aligned with backend BookingCreateRequest)
export async function makeReservation(payload: BookingCreateRequest): Promise<Reservation> {
  console.log("[Reservation Payload]", payload);

  try {
    const res = await createBooking(payload);

    // Try to fetch user details by email (optional)
    try {
      const user = await getUserByEmail(payload.userId.toString()); // careful: your API expects email, not id
      userCache.set(user.userId, user);
      return { ...res, user };
    } catch {
      return { ...res };
    }
  } catch (err) {
    console.error("Failed to create booking:", err);
    throw err;
  }
}

// Filter reservations by user email
export function byUser(email: string) {
  return (r: Reservation) => r.user?.email === email;
}

// Remove a reservation by ID
export function remove(items: Reservation[], id: number) {
  return items.filter((r) => r.bookingId !== id);
}

// Check if reservation is in the past
export function isPast(r: Reservation) {
  return new Date(r.bookingEnd).getTime() < Date.now();
}

// Format range into date + time labels
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

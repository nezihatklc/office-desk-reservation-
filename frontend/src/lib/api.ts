// src/lib/api.ts
import axios from "axios";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.trim() ||
  "http://localhost:5138/api"; // fallback to the common HTTP dev port

console.log("[api] baseURL =", API_BASE);

const API = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ---------- Types ----------
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  created: string; // ISO
}

export interface BookingResponse {
  bookingId: number;
  userId: number;
  deskId: number;
  bookingDate: string;   // ISO date or date-only
  bookingStart: string;  // ISO datetime (UTC)
  bookingEnd: string;    // ISO datetime (UTC)
  status?: string | null;
  created: string;       // ISO
}

export interface BookingCreateRequest {
  userId: number;
  deskId: number;
  bookingDate: string;   // "YYYY-MM-DD"
  bookingStart: string;  // ISO datetime
  bookingEnd: string;    // ISO datetime
  status?: string | null;
}

export interface DeskSummary {
  deskId: number;
  workspaceId: number;
  deskCode: string;  // e.g., "A1"
  isActive: boolean;
}

// 🔹 Audit Logs type
export interface AuditLogResponse {
  logId: number;
  userId: number;
  action: string;
  logTime: string; // ISO datetime
}

// ---------- Users ----------
export async function registerUser(payload: RegisterPayload): Promise<UserResponse> {
  const { data } = await API.post<UserResponse>("/Users/register", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<UserResponse> {
  const { data } = await API.post<UserResponse>("/Users/login", payload);
  return data;
}

// byEmail via query param (avoids '@' routing issues)
export async function getUserByEmail(email: string): Promise<UserResponse> {
  const { data } = await API.get<UserResponse>("/Users/byEmail", { params: { email } });
  return data;
}

// ---------- Desks ----------
export async function listDesks(): Promise<DeskSummary[]> {
  const { data } = await API.get<DeskSummary[]>("/Desks");
  return data;
}

// ---------- Bookings ----------
export async function listBookings(): Promise<BookingResponse[]> {
  const { data } = await API.get<BookingResponse[]>("/Bookings");
  return data;
}

export async function createBooking(req: BookingCreateRequest): Promise<BookingResponse> {
  const { data } = await API.post<BookingResponse>("/Bookings", req);
  return data;
}

export async function listUpcomingBookings(): Promise<BookingResponse[]> {
  const { data } = await API.get<BookingResponse[]>("/Bookings/upcoming");
  return data;
}

// 🔹 Notice: past bookings are audit logs
export async function listPastBookings(): Promise<AuditLogResponse[]> {
  const { data } = await API.get<AuditLogResponse[]>("/Bookings/past");
  return data;
}

// ---------- Audit Logs ----------
export async function getAuditLogs(): Promise<AuditLogResponse[]> {
  const { data } = await API.get<AuditLogResponse[]>("/AuditLogs");
  return data;
}

export async function getAuditLogById(id: number): Promise<AuditLogResponse> {
  const { data } = await API.get<AuditLogResponse>(`/AuditLogs/${id}`);
  return data;
}

export async function getAuditLogsByUser(userId: number): Promise<AuditLogResponse[]> {
  const { data } = await API.get<AuditLogResponse[]>(`/AuditLogs/user/${userId}`);
  return data;
}

export async function getAuditLogsByDate(start: string, end: string): Promise<AuditLogResponse[]> {
  const { data } = await API.get<AuditLogResponse[]>("/AuditLogs/date", {
    params: { start, end },
  });
  return data;
}

export async function getAuditLogsPaged(page = 1, pageSize = 10): Promise<AuditLogResponse[]> {
  const { data } = await API.get<AuditLogResponse[]>("/AuditLogs/paged", {
    params: { page, pageSize },
  });
  return data;
}

export default API;

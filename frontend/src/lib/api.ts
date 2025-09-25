// src/lib/api.ts
import axios from "axios";

const API_BASE =
  (import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.trim() : null) ||
  "http://localhost:5138/api";

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

export interface RegisterResponse {
  user: UserResponse;
  devConfirmUrl?: string;
  devConfirmCode?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResendEmailPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devToken?: string;
  devResetUrl?: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  emailConfirmed?: boolean;
  role?: string;
}

// ---------- WORKSPACES ----------

export interface WorkspaceResponse {
  workspaceId: number;
  workspaceName: string;
  floorNumber: string;
  deskCode: string;
  capacity: number;
  teamName?: string | null;
  created: string;
}

export interface WorkspaceUpdatePayload {
  workspaceName?: string;
  floorNumber?: string;
  deskCode?: string;
  capacity?: number;
  teamName?: string | null;
}

export async function listWorkspaces(): Promise<WorkspaceResponse[]> {
  const { data } = await API.get<WorkspaceResponse[]>("/Workspaces");
  return data;
}

export async function updateWorkspace(
  workspaceId: number,
  payload: WorkspaceUpdatePayload
): Promise<WorkspaceResponse> {
  const { data } = await API.put<WorkspaceResponse>(`/Workspaces/${workspaceId}`, payload);
  return data;
}

// ---------- AUTH ----------

// ---------- AUTH ----------

// Register
export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await API.post("/Auth/register", payload);
  const user = data.user || data;
  const devConfirmUrl = typeof data.devConfirmUrl === "string" ? data.devConfirmUrl : undefined;
  const devConfirmCode = typeof data.devConfirmCode === "string" ? data.devConfirmCode : undefined;

  return {
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailConfirmed: user.confirmedEmail ?? user.emailConfirmed ?? false,
      role: user.role ?? user.Role,
    },
    devConfirmUrl,
    devConfirmCode,
  };
}

export async function loginUser(payload: LoginPayload): Promise<UserResponse> {
  const { data } = await API.post("/Auth/login", payload);
  const user = data.user || data;

  return {
    userId: user.userId ?? user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailConfirmed: user.emailConfirmed ?? user.EmailConfirmed ?? user.confirmedEmail ?? false,
    role: user.role ?? user.Role,
  };
}

// Confirm Email
export interface ConfirmEmailResponse {
  message: string;
  success?: boolean;
}

export async function confirmEmail(email: string, token: string, code: string): Promise<ConfirmEmailResponse> {
  const { data } = await API.post("/Auth/confirmEmail", { email, token, code });

  const success =
    typeof data.success === "boolean"
      ? data.success
      : /success|already confirmed/i.test(String(data.message ?? ""));

  return {
    message: data.message || "",
    success,
  };
}

// Resend confirmation email
export interface ResendConfirmationResponse {
  message: string;
  devConfirmUrl?: string;
  devConfirmCode?: string;
}

export async function resendConfirmationEmail(payload: ResendEmailPayload): Promise<ResendConfirmationResponse> {
  const { data } = await API.post("/Auth/resendConfirmationEmail", payload);
  return {
    message: data.message || "Confirmation email sent.",
    devConfirmUrl: data.devConfirmUrl,
    devConfirmCode: data.devConfirmCode,
  };
}

// ---------- FACILITIES ----------

export interface FacilityResponse {
  facilityId: number;
  name: string;
  description?: string | null;
}

export async function listFacilities(): Promise<FacilityResponse[]> {
  const { data } = await API.get<FacilityResponse[]>("/Facilities");
  return data;
}

// Forgot password
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  const { data } = await API.post("/Auth/forgotPassword", payload);
  return {
    message: data.message || "Password reset link sent to email.",
    devToken: typeof data.devToken === "string" ? data.devToken : undefined,
    devResetUrl: typeof data.devResetUrl === "string" ? data.devResetUrl : undefined,
  };
}

// Reset password
export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  const { data } = await API.post("/Auth/resetPassword", payload);
  return {
    message: data.message || "Password reset successful.",
  };
}

// Get user details
export async function getUserInfo(userId: number): Promise<UserResponse> {
  const { data } = await API.get("/Auth/manage/info", { params: { userId } });
  return {
    userId: data.userId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    emailConfirmed: data.emailConfirmed ?? data.confirmedEmail ?? false,
    role: data.role ?? data.Role,
  };
}

// Logout (dummy, no token yet)
export async function logoutUser(): Promise<void> {
  console.log("[api] logoutUser called – no token logic to clear.");
}

// ---------- DESKS ----------
export interface DeskSummary {
  deskId: number;
  workspaceId: number;
  deskCode: string;
  isActive: boolean;
  facilities?: string[];
  status?: "MyReservation" | "Available" | "BookedByOthers" | "Unavailable";
  workspaceName?: string | null;
  focusMode?: string | null;
  noiseLevel?: number | null;
}

export async function listDesks(): Promise<DeskSummary[]> {
  const { data } = await API.get<DeskSummary[]>("/Desks");
  return data;
}

// ---------- BOOKINGS ----------
export interface BookingResponse {
  bookingId: number;
  userId: number;
  deskId: number;
  deskCode?: string | null;
  bookingDate: string;
  bookingStart: string;
  bookingEnd: string;
  status?: string | null;
  created: string;
  user?: UserResponse | null;
}

export interface BookingCreateRequest {
  userId: number;
  deskId: number;
  bookingDate: string;
  bookingStart: string;
  bookingEnd: string;
  status?: string | null;
}

export interface BookingCheckoutRequest {
  performedByUserId: number;
}

export interface BookingCheckinRequest {
  performedByUserId: number;
}

export async function listBookings(): Promise<BookingResponse[]> {
  const { data } = await API.get<BookingResponse[]>("/Bookings");
  return data;
}

export async function createBooking(req: BookingCreateRequest): Promise<BookingResponse> {
  const { data } = await API.post<BookingResponse>("/Bookings", req);
  return data;
}

export async function checkoutBooking(
  bookingId: number,
  payload: BookingCheckoutRequest
): Promise<BookingResponse> {
  const { data } = await API.post<BookingResponse>(`/Bookings/${bookingId}/checkout`, payload);
  return data;
}

export async function checkinBooking(
  bookingId: number,
  payload: BookingCheckinRequest
): Promise<BookingResponse> {
  const { data } = await API.post<BookingResponse>(`/Bookings/${bookingId}/checkin`, payload);
  return data;
}

export async function listUpcomingBookings(): Promise<BookingResponse[]> {
  const { data } = await API.get<BookingResponse[]>("/Bookings/upcoming");
  return data;
}

export async function listPastBookings(): Promise<any[]> {
  const { data } = await API.get<any[]>("/Bookings/past");
  return data;
}

// ---------- DESK SUGGESTIONS ----------

export interface DeskSuggestionRequestPayload {
  userId: number;
  start: string;
  end: string;
  workspaceId?: number;
  limit?: number;
  prioritizeFocus?: boolean;
  alignWithTeam?: boolean;
  desiredFacilities?: string[];
}

export interface DeskSuggestionItem {
  deskId: number;
  deskCode: string;
  workspaceId: number;
  workspaceName?: string | null;
  facilities: string[];
  score: number;
  reasons: string[];
  confidence: number;
  teammateCount: number;
  teammateNames: string[];
  focusMode?: string | null;
  noiseLevel?: number | null;
  focusMatch: boolean;
  teamAlignmentMatch: boolean;
}

export interface DeskSuggestionResponsePayload {
  userId: number;
  requestedStart: string;
  requestedEnd: string;
  generatedAt: string;
  suggestions: DeskSuggestionItem[];
  teamName?: string | null;
  teamPresenceCount: number;
  teamPresenceSample: string[];
  focusPreference?: string | null;
  focusPreferenceInferred: boolean;
}

export async function fetchDeskSuggestions(
  payload: DeskSuggestionRequestPayload
): Promise<DeskSuggestionResponsePayload> {
  const { data } = await API.post<DeskSuggestionResponsePayload>("/DeskSuggestions", payload);
  return data;
}

// ---------- AUDIT LOGS ----------
export interface AuditLogResponse {
  logId: number;
  userId: number;
  action: string;
  logTime: string;
}

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

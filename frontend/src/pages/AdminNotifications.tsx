import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAllReservations, type Reservation } from "../lib/reservations";
import API, {
  listWorkspaces,
  listDesks,
  type WorkspaceResponse,
  type DeskSummary,
  getAuditLogs,
  type AuditLogResponse,
  getUserInfo,
  type UserResponse,
} from "../lib/api";
import { isoToHHMMInTR, workspaceFromDesk } from "../lib/floorUtils";
import {
  addCancellationRecord,
  ADMIN_UNREAD_FLAG_KEY,
} from "../lib/notificationStore";

const ADMIN_READ_STORAGE_KEY = "notifications:admin:read-ids";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ADMIN_READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === "string"));
    }
  } catch (err) {
    console.warn("Failed to load admin read notifications", err);
  }
  return new Set();
}

function persistReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn("Failed to persist admin read notifications", err);
  }
}

function updateUnreadFlag(hasUnread: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_UNREAD_FLAG_KEY, hasUnread ? "1" : "0");
    window.dispatchEvent(new Event("notifications:sync"));
  } catch (err) {
    console.warn("Failed to persist admin notification badge", err);
  }
}

type Severity = "info" | "alert" | "warning";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity?: Severity;
  reservation?: Reservation;
};

type NotificationWithRead = NotificationItem & { read: boolean };

type CancellationDetails = {
  bookingId: number;
  deskId: number;
};

const TEAM_ALERT_TIMESTAMP_KEY = "notifications:admin:teamless-timestamps";

function loadTeamAlertTimestamps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TEAM_ALERT_TIMESTAMP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === "string") {
          acc[key] = value;
        }
        return acc;
      }, {});
    }
  } catch (err) {
    console.warn("Failed to load team alert timestamps", err);
  }
  return {};
}

function persistTeamAlertTimestamps(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEAM_ALERT_TIMESTAMP_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to persist team alert timestamps", err);
  }
}

function isDetailedCancellation(action: string | undefined | null): boolean {
  if (!action) return false;
  return /deleted booking\s+\d+/i.test(action) && /\(desk\s+\d+/i.test(action);
}

function parseCancellationDetails(action: string): CancellationDetails | null {
  const match = action.match(/deleted booking\s+(\d+)\s*\(desk\s+(\d+)\)/i);
  if (!match) return null;
  const [, bookingIdStr, deskIdStr] = match;
  const bookingId = Number.parseInt(bookingIdStr, 10);
  const deskId = Number.parseInt(deskIdStr, 10);
  if (Number.isNaN(bookingId) || Number.isNaN(deskId)) return null;
  return { bookingId, deskId };
}

function isCheckoutLog(action: string | undefined | null): boolean {
  if (!action) return false;
  return /checked out booking\s+\d+/i.test(action) && /\(desk\s+\d+/i.test(action);
}

function parseCheckoutDetails(action: string): CancellationDetails | null {
  const match = action.match(/checked out booking\s+(\d+)\s*\(desk\s+(\d+)\)/i);
  if (!match) return null;
  const [, bookingIdStr, deskIdStr] = match;
  const bookingId = Number.parseInt(bookingIdStr, 10);
  const deskId = Number.parseInt(deskIdStr, 10);
  if (Number.isNaN(bookingId) || Number.isNaN(deskId)) return null;
  return { bookingId, deskId };
}

function isCheckinLog(action: string | undefined | null): boolean {
  if (!action) return false;
  return /checked in booking\s+\d+/i.test(action) && /\(desk\s+\d+/i.test(action);
}

function parseCheckinDetails(action: string): CancellationDetails | null {
  const match = action.match(/checked in booking\s+(\d+)\s*\(desk\s+(\d+)\)/i);
  if (!match) return null;
  const [, bookingIdStr, deskIdStr] = match;
  const bookingId = Number.parseInt(bookingIdStr, 10);
  const deskId = Number.parseInt(deskIdStr, 10);
  if (Number.isNaN(bookingId) || Number.isNaN(deskId)) return null;
  return { bookingId, deskId };
}

function formatHeading(date: Date): string {
  const today = new Date();
  const startOfDay = (value: Date) => {
    const clone = new Date(value);
    clone.setHours(0, 0, 0, 0);
    return clone.getTime();
  };

  const diffDays = Math.round((startOfDay(date) - startOfDay(today)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [deskSummaries, setDeskSummaries] = useState<DeskSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [userLookup, setUserLookup] = useState<Record<number, UserResponse>>({});
  const userLookupRef = useRef<Record<number, UserResponse>>({});
  const teamAlertTimestampRef = useRef<Record<string, string>>({});
  const teamAlertTimestampsLoaded = useRef(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    userLookupRef.current = userLookup;
  }, [userLookup]);

  const ensureTeamAlertTimestampsLoaded = useCallback(() => {
    if (!teamAlertTimestampsLoaded.current) {
      teamAlertTimestampRef.current = loadTeamAlertTimestamps();
      teamAlertTimestampsLoaded.current = true;
    }
  }, []);

  const getTeamAlertTimestamp = useCallback(
    (workspaceId: number) => {
      ensureTeamAlertTimestampsLoaded();
      const key = String(workspaceId);
      const existing = teamAlertTimestampRef.current[key];
      if (existing) return existing;
      const next = new Date().toISOString();
      teamAlertTimestampRef.current = { ...teamAlertTimestampRef.current, [key]: next };
      persistTeamAlertTimestamps(teamAlertTimestampRef.current);
      return next;
    },
    [ensureTeamAlertTimestampsLoaded]
  );

  const pruneTeamAlertTimestamps = useCallback(
    (activeIds: Set<number>) => {
      ensureTeamAlertTimestampsLoaded();
      const current = teamAlertTimestampRef.current;
      const next: Record<string, string> = {};
      let changed = false;
      Object.entries(current).forEach(([key, value]) => {
        const numericKey = Number.parseInt(key, 10);
        if (Number.isNaN(numericKey)) return;
        if (activeIds.has(numericKey)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      if (changed) {
        teamAlertTimestampRef.current = next;
        persistTeamAlertTimestamps(next);
      }
    },
    [ensureTeamAlertTimestampsLoaded]
  );

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ADMIN_READ_STORAGE_KEY) {
        setReadIds(loadReadIds());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [reservationData, workspaceData, deskData, auditLogData] = await Promise.all([
          getAllReservations(),
          listWorkspaces(),
          listDesks(),
          getAuditLogs(),
        ]);
        if (cancelled) return;
        setReservations(reservationData);
        setWorkspaces(workspaceData);
        setDeskSummaries(deskData);
        setAuditLogs(auditLogData);

        const knownUsers: Record<number, UserResponse> = { ...userLookupRef.current };
        reservationData.forEach((reservation) => {
          if (reservation.user) {
            knownUsers[reservation.user.userId] = reservation.user;
          }
        });

        const cancellationLogs = auditLogData.filter((log) => isDetailedCancellation(log.action));
        const checkoutLogs = auditLogData.filter((log) => isCheckoutLog(log.action));
        const checkinLogs = auditLogData.filter((log) => isCheckinLog(log.action));
        const relevantLogs = [...cancellationLogs, ...checkoutLogs, ...checkinLogs];
        const missingUserIds = Array.from(
          new Set(
            relevantLogs
              .map((log) => (typeof log.userId === "number" ? log.userId : null))
              .filter((value): value is number => value !== null)
          )
        ).filter((userId) => !knownUsers[userId]);

        if (missingUserIds.length > 0) {
          const fetchedUsers = await Promise.all(
            missingUserIds.map(async (userId) => {
              try {
                return await getUserInfo(userId);
              } catch (err) {
                console.warn(`Failed to load user info for cancellation log (user ${userId})`, err);
                return null;
              }
            })
          );
          if (cancelled) return;
          fetchedUsers.forEach((userRecord) => {
            if (userRecord) {
              knownUsers[userRecord.userId] = userRecord;
            }
          });
        }

        if (!cancelled) {
          setUserLookup(knownUsers);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load admin notifications", err);
        setError("We couldn't load admin notifications. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      updateUnreadFlag(false);
      return;
    }

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const notificationsList: NotificationItem[] = [];

    const deskById = new Map<number, DeskSummary>();
    deskSummaries.forEach((desk) => {
      deskById.set(desk.deskId, desk);
    });

    const activeTeamlessIds = new Set<number>();

    // === Newly created reservations (last 24h) ===
    const creationWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentCreations = reservations
      .map((reservation) => {
        const created = reservation.created ? new Date(reservation.created) : null;
        if (!created || Number.isNaN(created.getTime())) return null;
        return { reservation, created };
      })
      .filter((entry): entry is { reservation: Reservation; created: Date } => {
        if (!entry) return false;
        return entry.created >= creationWindowStart;
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime())
      .slice(0, 20);

    recentCreations.forEach(({ reservation, created }) => {
      const desk = deskById.get(reservation.deskId);
      const deskLabel = reservation.deskCode ?? desk?.deskCode ?? `Desk #${reservation.deskId}`;
      const workspaceLabel = desk?.workspaceName ?? workspaceFromDesk(reservation.deskCode ?? "");
      const userName = (() => {
        if (reservation.user) {
          const fullName = `${reservation.user.firstName ?? ""} ${reservation.user.lastName ?? ""}`.trim();
          if (fullName) return fullName;
          if (reservation.user.email) return reservation.user.email;
          return `User #${reservation.user.userId}`;
        }
        return `User #${reservation.userId}`;
      })();
      const bookingDate = new Date(reservation.bookingDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      notificationsList.push({
        id: `created-${reservation.bookingId}`,
        title: `${userName || "User"} reserved ${deskLabel}`,
        message: `${bookingDate} · ${isoToHHMMInTR(reservation.bookingStart)} – ${isoToHHMMInTR(
          reservation.bookingEnd
        )}${workspaceLabel ? ` · Zone ${workspaceLabel}` : ""}`,
        timestamp: created.toISOString(),
        severity: "info",
        reservation,
      });
    });

    // === Recent cancellations ===
    const cancellationLogs = auditLogs
      .filter((log) => isDetailedCancellation(log.action))
      .sort((a, b) => new Date(b.logTime).getTime() - new Date(a.logTime).getTime())
      .slice(0, 20);

    const seenCancellation = new Set<string>();

    cancellationLogs.forEach((log) => {
      if (!log.action) return;
      const details = parseCancellationDetails(log.action);
      if (!details) return;
      const dedupeKey = `${details.bookingId}-${log.logTime}`;
      if (seenCancellation.has(dedupeKey)) return;
      seenCancellation.add(dedupeKey);

      const desk = deskById.get(details.deskId);
      const deskLabel = desk?.deskCode ?? `Desk #${details.deskId}`;
      const workspaceLabel =
        desk?.workspaceName ?? (desk?.deskCode ? workspaceFromDesk(desk.deskCode) : undefined);

      const lookup = typeof log.userId === "number" ? userLookup[log.userId] : undefined;
      const fullName = lookup
        ? `${lookup.firstName ?? ""} ${lookup.lastName ?? ""}`.trim()
        : "";
      const ownerLabel = fullName
        ? fullName
        : lookup?.email ?? (typeof log.userId === "number" ? `User #${log.userId}` : "Unknown user");

      const cancelledAt = new Date(log.logTime);
      const cancelledDate = cancelledAt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      notificationsList.push({
        id: `cancellation-${log.logId}`,
        title: `Reservation cancelled (${deskLabel})`,
        message: `${ownerLabel}${workspaceLabel ? ` · Zone ${workspaceLabel}` : ""} · Booking #${details.bookingId} · Cancelled ${cancelledDate} at ${isoToHHMMInTR(
          log.logTime
        )}`,
        timestamp: cancelledAt.toISOString(),
        severity: "warning",
      });
    });

    const checkinLogs = auditLogs
      .filter((log) => isCheckinLog(log.action))
      .sort((a, b) => new Date(b.logTime).getTime() - new Date(a.logTime).getTime())
      .slice(0, 30);

    checkinLogs.forEach((log) => {
      if (!log.action) return;
      const details = parseCheckinDetails(log.action);
      if (!details) return;

      const booking = reservations.find((reservation) => reservation.bookingId === details.bookingId);
      const desk = booking ? deskById.get(booking.deskId) : deskById.get(details.deskId);
      const deskLabel = booking?.deskCode ?? desk?.deskCode ?? `Desk #${details.deskId}`;

      const actor = typeof log.userId === "number" ? userLookup[log.userId] : undefined;
      const actorName = actor
        ? `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim()
        : typeof log.userId === "number"
          ? `User #${log.userId}`
          : "System";

      const occupantUser = booking?.user ?? (booking ? userLookup[booking.userId] : undefined);
      const occupantName = occupantUser
        ? `${occupantUser.firstName ?? ""} ${occupantUser.lastName ?? ""}`.trim()
        : booking
          ? `User #${booking.userId}`
          : undefined;

      const checkinDate = new Date(log.logTime);
      const checkinValid = !Number.isNaN(checkinDate.getTime());
      const checkinTimestamp = checkinValid ? checkinDate.toISOString() : new Date().toISOString();
      const timeLabel = checkinValid ? ` at ${isoToHHMMInTR(checkinTimestamp)}` : "";

      const occupantSuffix = occupantName ? ` · Reservation by ${occupantName}` : "";

      notificationsList.push({
        id: `checkin-${log.logId}`,
        title: `${deskLabel} checked in`,
        message: `${actorName || "User"} checked in${timeLabel}${occupantSuffix}.`,
        timestamp: checkinTimestamp,
        severity: "info",
      });
    });

    const checkoutLogs = auditLogs
      .filter((log) => isCheckoutLog(log.action))
      .sort((a, b) => new Date(b.logTime).getTime() - new Date(a.logTime).getTime())
      .slice(0, 30);

    checkoutLogs.forEach((log) => {
      if (!log.action) return;
      const details = parseCheckoutDetails(log.action);
      if (!details) return;

      const booking = reservations.find((reservation) => reservation.bookingId === details.bookingId);
      const desk = booking ? deskById.get(booking.deskId) : deskById.get(details.deskId);
      const deskLabel = booking?.deskCode ?? desk?.deskCode ?? `Desk #${details.deskId}`;

      const actor = typeof log.userId === "number" ? userLookup[log.userId] : undefined;
      const actorName = actor
        ? `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim()
        : typeof log.userId === "number"
          ? `User #${log.userId}`
          : "System";

      const occupantUser = booking?.user ?? (booking ? userLookup[booking.userId] : undefined);
      const occupantName = occupantUser
        ? `${occupantUser.firstName ?? ""} ${occupantUser.lastName ?? ""}`.trim()
        : booking
          ? `User #${booking.userId}`
          : undefined;

      const checkoutDate = new Date(log.logTime);
      const checkoutValid = !Number.isNaN(checkoutDate.getTime());
      const checkoutTimestamp = checkoutValid ? checkoutDate.toISOString() : new Date().toISOString();
      const timeLabel = checkoutValid ? ` at ${isoToHHMMInTR(checkoutTimestamp)}` : "";

      const occupantSuffix = occupantName ? ` · Original booking by ${occupantName}` : "";

      notificationsList.push({
        id: `checkout-${log.logId}`,
        title: `${deskLabel} checked out`,
        message: `${actorName || "User"} checked out${timeLabel}${occupantSuffix}.`,
        timestamp: checkoutTimestamp,
        severity: "info",
      });
    });

    // === Upcoming reservations starting soon ===
    reservations
      .filter((reservation) => {
        const start = new Date(reservation.bookingStart);
        return start >= now && start <= soonThreshold;
      })
      .sort((a, b) => a.bookingStart.localeCompare(b.bookingStart))
      .slice(0, 6)
      .forEach((reservation) => {
        const created = reservation.created ? new Date(reservation.created) : null;
        let timestamp = new Date().toISOString();
        if (created && !Number.isNaN(created.getTime())) {
          timestamp = created.toISOString();
        }
        const userName = reservation.user
          ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
          : "Guest";
        const desk = deskById.get(reservation.deskId);
        const workspaceLabel =
          desk?.workspaceName ?? workspaceFromDesk(reservation.deskCode ?? "");
        notificationsList.push({
          id: `soon-${reservation.bookingId}`,
          title: `Desk ${reservation.deskCode ?? reservation.deskId} starts soon`,
          message: `${userName} begins at ${isoToHHMMInTR(
            reservation.bookingStart
          )}${workspaceLabel ? ` · Zone ${workspaceLabel}` : ""}`,
          timestamp,
          severity: "info",
          reservation,
        });
      });

    // === Workspace utilisation today ===
    const today = new Date();
    const bookingsToday = reservations.filter((reservation) => {
      const start = new Date(reservation.bookingStart);
      return sameDay(start, today);
    });

    const bookingsByWorkspace = new Map<number, Reservation[]>();
    bookingsToday.forEach((reservation) => {
      const desk = deskById.get(reservation.deskId);
      const workspaceId = desk?.workspaceId;
      if (!workspaceId) return;
      const bucket = bookingsByWorkspace.get(workspaceId) ?? [];
      bucket.push(reservation);
      bookingsByWorkspace.set(workspaceId, bucket);
    });

    workspaces.forEach((workspace) => {
      const bookings = bookingsByWorkspace.get(workspace.workspaceId) ?? [];
      if (workspace.capacity <= 0 || bookings.length === 0) return;
      const utilisation = bookings.length / workspace.capacity;
      if (utilisation >= 0.75) {
        const workspaceLabel =
          workspace.workspaceName || workspace.deskCode || `Workspace ${workspace.workspaceId}`;
        const earliestStart = bookings.reduce<number | null>((earliest, reservation) => {
          const startTime = new Date(reservation.bookingStart).getTime();
          if (Number.isNaN(startTime)) return earliest;
          if (earliest === null || startTime < earliest) return startTime;
          return earliest;
        }, null);
        const occupancyTimestamp = earliestStart
          ? new Date(earliestStart).toISOString()
          : now.toISOString();

        notificationsList.push({
          id: `occupancy-${workspace.workspaceId}`,
          title: `High occupancy in workspace ${workspaceLabel}`,
          message: `${bookings.length} of ${workspace.capacity} desks booked today (${Math.round(
            utilisation * 100
          )}% utilised).`,
          timestamp: occupancyTimestamp,
          severity: utilisation >= 0.9 ? "alert" : "warning",
        });
      }
    });

    // === Workspaces missing team assignment ===
    workspaces
      .filter((workspace) => !workspace.teamName)
      .forEach((workspace) => {
        activeTeamlessIds.add(workspace.workspaceId);
        const workspaceLabel =
          workspace.workspaceName || workspace.deskCode || `Workspace ${workspace.workspaceId}`;
        const timestamp = getTeamAlertTimestamp(workspace.workspaceId);
        notificationsList.push({
          id: `team-${workspace.workspaceId}`,
          title: `${workspaceLabel} has no team assigned`,
          message: "Assign a team to improve smart suggestions and reporting.",
          timestamp,
          severity: "info",
        });
      });

    pruneTeamAlertTimestamps(activeTeamlessIds);

    // Ensure deterministic ordering: newest first
    notificationsList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    setNotifications(notificationsList);
  }, [
    reservations,
    workspaces,
    deskSummaries,
    auditLogs,
    userLookup,
    isAdmin,
    getTeamAlertTimestamp,
    pruneTeamAlertTimestamps,
  ]);

  // derive read state combined with notifications list
  const notificationsWithRead = useMemo<NotificationWithRead[]>(() => {
    return notifications.map((item) => ({
      ...item,
      read: readIds.has(item.id),
    }));
  }, [notifications, readIds]);

  const unreadCount = useMemo(
    () => notificationsWithRead.filter((item) => !item.read).length,
    [notificationsWithRead]
  );

  useEffect(() => {
    if (isAdmin) {
      updateUnreadFlag(unreadCount > 0);
    }
  }, [unreadCount, isAdmin]);

  async function cancelReservation(item: NotificationWithRead) {
    const reservation = item.reservation;
    if (!reservation) return;
    const deskLabel = reservation.deskCode ?? `Desk #${reservation.deskId}`;
    const confirmed = window.confirm(`Cancel reservation for ${deskLabel}?`);
    if (!confirmed) return;

    try {
      setCancelingId(reservation.bookingId);
      await API.delete(`/Bookings/${reservation.bookingId}`);

      addCancellationRecord({
        bookingId: reservation.bookingId,
        userId: reservation.userId,
        deskCode: reservation.deskCode ?? reservation.deskId.toString(),
        bookingDate: reservation.bookingDate,
        bookingStart: reservation.bookingStart,
        bookingEnd: reservation.bookingEnd,
        recordedAt: new Date().toISOString(),
      });

      setReservations((prev) => prev.filter((entry) => entry.bookingId !== reservation.bookingId));
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        persistReadIds(next);
        return next;
      });
      setBanner({ tone: "success", text: `Cancelled reservation for ${deskLabel}.` });
    } catch (err) {
      console.error("Failed to cancel reservation", err);
      setBanner({ tone: "error", text: "Failed to cancel reservation. Please try again." });
    } finally {
      setCancelingId(null);
    }
  }

  function toggleRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persistReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    const ids = new Set(readIds);
    notificationsWithRead.forEach((item) => ids.add(item.id));
    persistReadIds(ids);
    setReadIds(new Set(ids));
  }

  const grouped = useMemo(() => {
    const sections = new Map<string, NotificationWithRead[]>();
    notificationsWithRead.forEach((item) => {
      const label = formatHeading(new Date(item.timestamp));
      if (!sections.has(label)) {
        sections.set(label, []);
      }
      sections.get(label)!.push(item);
    });

    return Array.from(sections.entries()).map(([label, items]) => ({
      label,
      items: items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }));
  }, [notificationsWithRead]);

  if (!isAdmin) {
    return <Navigate to="/floor" replace />;
  }

  return (
    <div className="page-shell notifications-page">
      <section className="panel-glass notifications-card">
        <header className="notifications-header">
          <div>
            <h1>Admin Notifications</h1>
            <p className="muted">Monitor upcoming desk usage, occupancy risks, and configuration tasks.</p>
          </div>
          <div className="notifications-actions">
            <span className="notifications-count" aria-live="polite">
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
        </header>

        {banner && (
          <div
            className={`notification-banner notification-banner--${banner.tone}`}
            role="status"
            aria-live="polite"
          >
            {banner.text}
          </div>
        )}

        {loading ? (
          <div className="panel-dark notifications-empty" role="status" aria-live="polite">
            Loading notifications…
          </div>
        ) : error ? (
          <div className="panel-warn notifications-empty" role="alert">
            {error}
          </div>
        ) : grouped.length === 0 ? (
          <div className="panel-dark notifications-empty" role="status" aria-live="polite">
            You're all caught up. New admin notifications will appear here.
          </div>
        ) : (
          <div className="notifications-groups">
            {grouped.map((section) => (
              <section key={section.label} className="notifications-group" aria-label={section.label}>
                <h2>{section.label}</h2>
                <ul>
                  {section.items.map((item) => (
                    <li
                      key={item.id}
                      className={`notification${item.read ? " read" : ""}${item.severity ? ` notification--${item.severity}` : ""}`}
                    >
                      <div className="notification-body">
                        <div className="notification-title-row">
                          <span className="notification-title">{item.title}</span>
                          <time dateTime={item.timestamp}>{isoToHHMMInTR(item.timestamp)}</time>
                        </div>
                        <p>{item.message}</p>
                      </div>
                      <div className="notification-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => toggleRead(item.id)}
                        >
                          {item.read ? "Mark as unread" : "Mark as read"}
                        </button>
                        {item.reservation && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => cancelReservation(item)}
                            disabled={cancelingId === item.reservation.bookingId}
                          >
                            {cancelingId === item.reservation.bookingId ? "Cancelling…" : "Cancel reservation"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

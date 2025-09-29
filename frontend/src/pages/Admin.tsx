import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import axios from "axios";
import FloorPlan, { type DeskStatus, type LegendKey } from "../components/FloorPlan";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import {
  listDesks,
  listFacilities,
  listWorkspaces,
  updateWorkspace,
  type DeskSummary,
  type FacilityResponse,
  type WorkspaceResponse,
} from "../lib/api";
import {
  getAllReservations,
  checkinReservation,
  checkoutReservation,
  type Reservation,
} from "../lib/reservations";
import {
  WORKSPACES,
  HEATMAP_LOOKBACK_DAYS,
  generateDeskLayout,
  isoToHHMMInTR,
  isoDateKeyInTR,
  formatDateInTR,
  normalizeDeskCode,
  workspaceFromDesk,
  mapDeskStatus,
  describeFacility,
} from "../lib/floorUtils";

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const CHECKIN_EXPIRY_MINUTES = 60;
const NOW_REFRESH_INTERVAL_MS = 30_000;
const MINUTE_IN_MS = 60_000;
const MAX_RECENT_BOOKINGS = 12;

const DESK_STATUS_META: Record<LegendKey, { label: string; helper: string; tone: "available" | "busy" | "mine" | "offline" }> = {
  available: {
    label: "Available",
    helper: "No reservations yet for this desk on the selected date.",
    tone: "available",
  },
  booked: {
    label: "Reserved",
    helper: "Colleagues have active reservations for the selected date.",
    tone: "busy",
  },
  byMe: {
    label: "Reserved by you",
    helper: "You're holding this desk for the chosen focus date.",
    tone: "mine",
  },
  unavailable: {
    label: "Unavailable",
    helper: "Desk is marked out of service or restricted from booking.",
    tone: "offline",
  },
};

const INACTIVE_RESERVATION_STATUSES = new Set(["checkedout", "cancelled", "completed"]);

function hasCheckinExpired(reservation: Reservation, referenceMs: number): boolean {
  const status = reservation.status?.trim().toLowerCase();
  if (status === "checkedin") return false;
  if (status && INACTIVE_RESERVATION_STATUSES.has(status)) return true;

  const startMs = new Date(reservation.bookingStart).getTime();
  if (Number.isNaN(startMs)) return false;

  return referenceMs > startMs + CHECKIN_EXPIRY_MINUTES * MINUTE_IN_MS;
}

function isReservationActive(reservation: Reservation, referenceMs: number): boolean {
  const status = reservation.status?.trim().toLowerCase();
  if (!status) {
    return !hasCheckinExpired(reservation, referenceMs);
  }
  if (INACTIVE_RESERVATION_STATUSES.has(status)) return false;
  if (status === "checkedin") return true;
  return !hasCheckinExpired(reservation, referenceMs);
}

type AdminConfirmAction = {
  kind: "checkin" | "checkout";
  reservation: Reservation;
  deskLabel: string;
};

export default function Admin() {
  const { user } = useAuth();
  const [deskSummaries, setDeskSummaries] = useState<DeskSummary[]>([]);
  const [facilityCatalog, setFacilityCatalog] = useState<FacilityResponse[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [workspaceCatalog, setWorkspaceCatalog] = useState<WorkspaceResponse[]>([]);
  const [teamDrafts, setTeamDrafts] = useState<Record<number, string>>({});
  const [teamNotice, setTeamNotice] = useState<string | null>(null);
  const [savingWorkspaceId, setSavingWorkspaceId] = useState<number | null>(null);
  const [checkinBusyId, setCheckinBusyId] = useState<number | null>(null);
  const [checkoutBusyId, setCheckoutBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<AdminConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const baseLayout = useMemo(generateDeskLayout, []);
  const todayKey = useMemo(() => isoDateKeyInTR(new Date().toISOString()), []);

  const dateLabel = useMemo(() => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [date]);

  const workspaceOptions = useMemo(() => ["All", ...WORKSPACES], []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [desks, bookings, facilities, workspaces] = await Promise.all([
        listDesks(),
        getAllReservations(),
        listFacilities(),
        listWorkspaces(),
      ]);
      setDeskSummaries(desks);
      setReservations(bookings);
      setFacilityCatalog(facilities);
      setWorkspaceCatalog(workspaces);
      setTeamDrafts(() => {
        const draftMap: Record<number, string> = {};
        workspaces.forEach((workspace) => {
          draftMap[workspace.workspaceId] = workspace.teamName ?? "";
        });
        return draftMap;
      });
      setTeamNotice(null);
      setError(null);
    } catch (err) {
      console.error("Failed to load admin data", err);
      setError("We couldn't load the latest data. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const tick = () => setNowMs(Date.now());
    const intervalId = window.setInterval(tick, NOW_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 3200);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const deskByCode = useMemo(() => {
    const map = new Map<string, DeskSummary>();
    deskSummaries.forEach((summary) => {
      map.set(normalizeDeskCode(summary.deskCode), summary);
    });
    return map;
  }, [deskSummaries]);

  const deskById = useMemo(() => {
    const map = new Map<number, DeskSummary>();
    deskSummaries.forEach((summary) => {
      map.set(summary.deskId, summary);
    });
    return map;
  }, [deskSummaries]);

  const facilityLookup = useMemo(() => {
    const map = new Map<string, string[]>();

    const pushUnique = (bucket: string[], value: string | null | undefined) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!bucket.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
        bucket.push(trimmed);
      }
    };

    facilityCatalog.forEach((facility) => {
      if (!facility.name) return;
      const key = normalizeDeskCode(facility.name);
      if (!key) return;

      const bucket = map.get(key) ?? [];
      const source = facility.description ?? "";
      const segments = source
        .split(/[\r\n•,;]+/)
        .flatMap((segment) =>
          segment.includes(" - ") ? segment.split(/\s-\s+/) : [segment]
        )
        .map((segment) => segment.replace(/^[\-–—]\s*/, "").trim())
        .filter(Boolean);

      if (segments.length > 0) {
        segments.forEach((segment) => pushUnique(bucket, segment));
      } else {
        pushUnique(bucket, source);
      }

      if (bucket.length === 0 && source) {
        pushUnique(bucket, source);
      }

      if (!map.has(key)) {
        map.set(key, bucket);
      }
    });

    return map;
  }, [facilityCatalog]);

  const reservationsByDeskForDate = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    reservations.forEach((reservation) => {
      const startIso = reservation.bookingStart ?? "";
      if (!startIso.startsWith(date)) return;
      if (!isReservationActive(reservation, nowMs)) return;

      if (!map.has(reservation.deskId)) {
        map.set(reservation.deskId, []);
      }

      map.get(reservation.deskId)!.push(reservation);
    });

    map.forEach((list) =>
      list.sort((a, b) => a.bookingStart.localeCompare(b.bookingStart))
    );

    return map;
  }, [reservations, date, nowMs]);

  const todaysReservations = useMemo(
    () => reservations.filter((reservation) => isoDateKeyInTR(reservation.bookingStart) === todayKey),
    [reservations, todayKey]
  );

  const attendanceSummary = useMemo(() => {
    const total = todaysReservations.length;
    let checkedIn = 0;
    let checkedOut = 0;
    let pending = 0;

    todaysReservations.forEach((reservation) => {
      const status = reservation.status?.trim().toLowerCase();
      if (status === "checkedin") checkedIn += 1;
      else if (status === "checkedout") checkedOut += 1;
      else pending += 1;
    });

    return { total, checkedIn, checkedOut, pending };
  }, [todaysReservations]);

  const overdueCheckins = useMemo(() => {
    const now = nowMs;
    return todaysReservations
      .filter((reservation) => {
        const status = reservation.status?.trim().toLowerCase();
        if (status === "checkedin" || status === "checkedout") return false;
        const startTime = new Date(reservation.bookingStart).getTime();
        if (Number.isNaN(startTime)) return false;
        return startTime < now;
      })
      .sort((a, b) => a.bookingStart.localeCompare(b.bookingStart));
  }, [todaysReservations, nowMs]);

  const workspaceHeat = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HEATMAP_LOOKBACK_DAYS);

    const counts = new Map<string, number>();
    let maxCount = 0;

    reservations.forEach((reservation) => {
      const rawStart = reservation.bookingStart ?? reservation.bookingDate;
      if (!rawStart) return;
      const start = new Date(rawStart);
      if (Number.isNaN(start.getTime())) return;
      if (start < cutoff) return;

      const summary = deskById.get(reservation.deskId);
      if (!summary) return;

      const workspace = workspaceFromDesk(summary.deskCode);
      if (!workspace) return;

      const updated = (counts.get(workspace) ?? 0) + 1;
      counts.set(workspace, updated);
      if (updated > maxCount) maxCount = updated;
    });

    const result: Record<string, number> = {};
    WORKSPACES.forEach((workspace) => {
      const total = counts.get(workspace) ?? 0;
      result[workspace] = maxCount > 0 ? total / maxCount : 0;
    });
    return result;
  }, [reservations, deskById]);

  const workspaceAssignments = useMemo(() => {
    return [...workspaceCatalog].sort((a, b) =>
      a.workspaceName.localeCompare(b.workspaceName, undefined, { sensitivity: "base" })
    );
  }, [workspaceCatalog]);

  const handleTeamDraftChange = useCallback((workspaceId: number, value: string) => {
    setTeamDrafts((prev) => ({ ...prev, [workspaceId]: value }));
    setTeamNotice(null);
  }, []);

  const persistTeamAssignment = useCallback(
    async (workspaceId: number, rawValue: string) => {
      const trimmed = rawValue.trim();
      const teamName = trimmed.length === 0 ? null : trimmed;

      setSavingWorkspaceId(workspaceId);
      setTeamNotice(null);

      try
      {
        const updated = await updateWorkspace(workspaceId, { teamName });

        setWorkspaceCatalog((prev) =>
          prev.map((workspace) =>
            workspace.workspaceId === updated.workspaceId
              ? { ...workspace, teamName: updated.teamName ?? null }
              : workspace
          )
        );

        setTeamDrafts((prev) => ({ ...prev, [workspaceId]: updated.teamName ?? "" }));

        const summaryLabel = updated.workspaceName || updated.deskCode || `Workspace ${updated.workspaceId}`;
        setTeamNotice(
          updated.teamName
            ? `${summaryLabel} is now assigned to ${updated.teamName}.`
            : `${summaryLabel} no longer has a team assignment.`
        );
      }
      catch (err)
      {
        console.error("Failed to update workspace team", err);
        const fallbackMessage = "Failed to update workspace team.";
        const message = axios.isAxiosError(err)
          ? (typeof err.response?.data?.message === "string" ? err.response.data.message : err.message)
          : err instanceof Error
            ? err.message
            : fallbackMessage;
        setError(message || fallbackMessage);
      }
      finally
      {
        setSavingWorkspaceId(null);
      }
    },
    [setError]
  );

  const handleSaveTeam = useCallback(
    (workspaceId: number) => {
      const currentDraft = teamDrafts[workspaceId] ?? "";
      void persistTeamAssignment(workspaceId, currentDraft);
    },
    [persistTeamAssignment, teamDrafts]
  );

  const handleClearTeam = useCallback(
    (workspaceId: number) => {
      setTeamDrafts((prev) => ({ ...prev, [workspaceId]: "" }));
      void persistTeamAssignment(workspaceId, "");
    },
    [persistTeamAssignment]
  );

  const applyReservationUpdate = useCallback((updated: Reservation) => {
    setReservations((prev) =>
      prev.map((entry) => (entry.bookingId === updated.bookingId ? { ...updated } : entry))
    );
  }, []);

  const formatReservationStatus = useCallback((status: string | null | undefined) => {
    const normalized = status?.trim().toLowerCase();
    switch (normalized) {
      case "checkedin":
        return "Checked-in ✅";
      case "checkedout":
        return "Checked-out 👋🏻";
      case "cancelled":
        return "Cancelled ❌";
      case "pending":
        return "Pending ⏳";
      default:
        return "Confirmed ⏳";
    }
  }, []);

  const requestCheckin = useCallback(
    (reservation: Reservation) => {
      const summary = deskById.get(reservation.deskId);
      const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
      setConfirmAction({ kind: "checkin", reservation, deskLabel });
    },
    [deskById]
  );

  const requestCheckout = useCallback(
    (reservation: Reservation) => {
      const summary = deskById.get(reservation.deskId);
      const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
      setConfirmAction({ kind: "checkout", reservation, deskLabel });
    },
    [deskById]
  );

  const performCheckin = useCallback(
    async (reservation: Reservation) => {
      if (!user || !reservation.bookingId) return;

      setError(null);
      setCheckinBusyId(reservation.bookingId);

      try {
        const updated = await checkinReservation({
          bookingId: reservation.bookingId,
          performedByUserId: user.userId,
        });

        applyReservationUpdate(updated);
        const deskLabel =
          updated.deskCode ?? deskById.get(updated.deskId)?.deskCode ?? `Desk ${updated.deskId}`;
        setBanner({ tone: "success", text: `Checked in to ${deskLabel}.` });
      } catch (err) {
        console.error("Admin check-in failed", err);
        const fallbackMessage = "Failed to check in. Please try again.";
        const message = axios.isAxiosError(err)
          ? (typeof err.response?.data?.message === "string" ? err.response.data.message : err.message)
          : err instanceof Error
            ? err.message
            : fallbackMessage;
        setError(message || fallbackMessage);
      } finally {
        setCheckinBusyId(null);
      }
    },
    [applyReservationUpdate, deskById, setError, user]
  );

  const performCheckout = useCallback(
    async (reservation: Reservation) => {
      if (!user || !reservation.bookingId) return;

      setError(null);
      setCheckoutBusyId(reservation.bookingId);

      try {
        const updated = await checkoutReservation({
          bookingId: reservation.bookingId,
          performedByUserId: user.userId,
        });

        applyReservationUpdate(updated);
        const deskLabel =
          updated.deskCode ?? deskById.get(updated.deskId)?.deskCode ?? `Desk ${updated.deskId}`;
        setBanner({ tone: "success", text: `Checked out of ${deskLabel}.` });
      } catch (err) {
        console.error("Admin checkout failed", err);
        const fallbackMessage = "Failed to check out. Please try again.";
        const message = axios.isAxiosError(err)
          ? (typeof err.response?.data?.message === "string"
              ? err.response.data.message
              : err.response?.status === 403
                ? "You are not allowed to perform this action."
                : err.message)
          : err instanceof Error
            ? err.message
            : fallbackMessage;
        setError(message || fallbackMessage);
      } finally {
        setCheckoutBusyId(null);
      }
    },
    [applyReservationUpdate, deskById, setError, user]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);

    try {
      if (confirmAction.kind === "checkin") {
        await performCheckin(confirmAction.reservation);
      } else {
        await performCheckout(confirmAction.reservation);
      }
    } finally {
      setConfirmBusy(false);
      setConfirmAction(null);
    }
  }, [confirmAction, performCheckin, performCheckout]);

  const viewDesks: Array<DeskStatus & { reservations: Array<{ occupant?: string; range?: string }> }> = useMemo(() => {
    return baseLayout.map((desk) => {
      const summary = deskByCode.get(desk.id);
      const deskId = summary?.deskId;
      const baseStatus = summary ? mapDeskStatus(summary.status) : "available";
      let status = baseStatus;
      const reservationsForDesk = (deskId ? reservationsByDeskForDate.get(deskId) : undefined) ?? [];

      const hasMine = reservationsForDesk.some((reservation) => reservation.userId === user?.userId);
      const hasOthers = reservationsForDesk.some((reservation) => reservation.userId !== user?.userId);

      if (hasMine) status = "byMe";
      else if (hasOthers) status = "booked";

      return {
        ...desk,
        status,
        reservations: reservationsForDesk.map((reservation) => ({
          occupant: reservation.user
            ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
            : undefined,
          range: `${isoToHHMMInTR(reservation.bookingStart)} – ${isoToHHMMInTR(reservation.bookingEnd)}`,
        })),
      } satisfies DeskStatus & { reservations: Array<{ occupant?: string; range?: string }> };
    });
  }, [baseLayout, deskByCode, reservationsByDeskForDate, user?.userId]);

  const selectedDesk = useMemo(
    () => (selectedDeskId ? viewDesks.find((desk) => desk.id === selectedDeskId) ?? null : null),
    [viewDesks, selectedDeskId]
  );

  useEffect(() => {
    if (!selectedDeskId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest("[data-desk-context]")) return;
      setSelectedDeskId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedDeskId, setSelectedDeskId]);

  const selectedDeskDetails = useMemo(() => {
    if (!selectedDeskId) return { reservations: [], facilities: [] as string[] };
    const summary = deskByCode.get(selectedDeskId);
    if (!summary) return { reservations: [], facilities: [] as string[] };

    const matchingReservations = reservationsByDeskForDate.get(summary.deskId) ?? [];
    const deskKey = normalizeDeskCode(summary.deskCode);
    const facilities = (facilityLookup.get(deskKey) ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    return {
      reservations: matchingReservations,
      facilities,
    };
  }, [selectedDeskId, deskByCode, reservationsByDeskForDate, facilityLookup]);

  const statusMeta = selectedDesk ? DESK_STATUS_META[selectedDesk.status] : null;
  const reservationsForDesk = selectedDeskDetails.reservations;

  const upcomingDemand = useMemo(() => {
    const today = new Date();
    const days: Array<{ label: string; count: number }> = [];

    for (let offset = 0; offset < 7; offset++) {
      const target = new Date(today);
      target.setDate(today.getDate() + offset);
      const isoPrefix = formatLocalDate(target);
      const count = reservations.filter((reservation) =>
        (reservation.bookingStart ?? "").startsWith(isoPrefix)
      ).length;

      days.push({
        label: target.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        count,
      });
    }

    return days;
  }, [reservations]);

  const reservationsForDate = useMemo(() => {
    return reservations
      .filter((reservation) => (reservation.bookingStart ?? "").startsWith(date))
      .filter((reservation) => isReservationActive(reservation, nowMs))
      .sort((a, b) => a.bookingStart.localeCompare(b.bookingStart));
  }, [reservations, date, nowMs]);

  const filteredReservations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return reservationsForDate.filter((reservation) => {
      const summary = deskById.get(reservation.deskId);
      const deskCode = summary?.deskCode ?? `Desk ${reservation.deskId}`;
      const workspace = workspaceFromDesk(summary?.deskCode);

      if (workspaceFilter !== "All" && workspace !== workspaceFilter) {
        return false;
      }

      if (!term) return true;

      const userName = reservation.user
        ? `${reservation.user.firstName} ${reservation.user.lastName}`.toLowerCase()
        : "";

      return (
        deskCode.toLowerCase().includes(term) ||
        workspace?.toLowerCase().includes(term) ||
        userName.includes(term)
      );
    });
  }, [reservationsForDate, deskById, workspaceFilter, searchTerm]);

  const uniqueUsersForDate = useMemo(() => {
    const ids = new Set<number>();
    reservationsForDate.forEach((reservation) => ids.add(reservation.userId));
    return ids.size;
  }, [reservationsForDate]);

  const summaryMetrics = useMemo(() => {
    const totalDesks = baseLayout.length;
    const booked = reservationsForDate.length;
    const utilization = totalDesks > 0 ? Math.round((booked / totalDesks) * 100) : 0;
    const desksWithReservations = new Set<number>();
    reservationsForDate.forEach((reservation) => desksWithReservations.add(reservation.deskId));

    return {
      totalDesks,
      bookedDesks: desksWithReservations.size,
      uniqueUsers: uniqueUsersForDate,
      utilization,
    };
  }, [baseLayout.length, reservationsForDate, uniqueUsersForDate]);

  const metricCards = useMemo(
    () => [
      {
        label: "Total desks",
        value: summaryMetrics.totalDesks,
        caption: "Active floor capacity",
        accent: "#60a5fa",
      },
      {
        label: `Booked on ${dateLabel}`,
        value: summaryMetrics.bookedDesks,
        caption: "Distinct desks reserved today",
        accent: "#34d399",
      },
      {
        label: "Unique employees",
        value: summaryMetrics.uniqueUsers,
        caption: "People with reservations",
        accent: "#fbbf24",
      },
      {
        label: "Utilisation",
        value: `${summaryMetrics.utilization}%`,
        caption: "Share of desks booked",
        accent: "#f97316",
      },
    ],
    [summaryMetrics, dateLabel]
  );

  const handleExportCsv = useCallback(() => {
    if (filteredReservations.length === 0) return;

    const rows = filteredReservations.map((reservation) => {
      const summary = deskById.get(reservation.deskId);
      const deskCode = summary?.deskCode ?? `Desk ${reservation.deskId}`;
      const workspace = workspaceFromDesk(summary?.deskCode) ?? "";
      const employee = reservation.user
        ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
        : "Unknown";

      return [
        deskCode,
        workspace,
        employee,
        isoToHHMMInTR(reservation.bookingStart),
        isoToHHMMInTR(reservation.bookingEnd),
      ]
        .map((value) => `"${(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const header = "desk,workspace,employee,start,end";
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservations-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredReservations, deskById, date]);

  if (!user) return null;

  if (user.role !== "Admin") {
    return (
      <div className="panel-glass" style={{ margin: "2rem auto", maxWidth: 640 }}>
        <h1>Access restricted</h1>
        <p className="muted">You need an administrator role to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="panel-glass admin-hero">
        <div className="admin-hero__text">
          <span className="admin-eyebrow">Admin Console</span>
          <h1>Workspace Administration</h1>
          <p className="muted">
            Monitor desk usage, review upcoming bookings, and keep facilities data accurate.
          </p>
        </div>
        <div className="admin-hero__side">
          <label className="label" htmlFor="admin-date">Focus date</label>
          <div className="admin-date-control">
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Previous day"
              onClick={() =>
                setDate((prev) => {
                  const base = parseLocalDate(prev);
                  base.setDate(base.getDate() - 1);
                  return formatLocalDate(base);
                })
              }
            >
              ‹
            </button>
            <input
              id="admin-date"
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Next day"
              onClick={() =>
                setDate((prev) => {
                  const base = parseLocalDate(prev);
                  base.setDate(base.getDate() + 1);
                  return formatLocalDate(base);
                })
              }
            >
              ›
            </button>
          </div>
          <span className="admin-date-caption">Currently showing data for {dateLabel}</span>
        </div>
      </header>

      {error && (
        <div className="panel-warn admin-alert" role="alert">
          {error}
        </div>
      )}

      <section className="admin-summary-grid">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {banner && (
        <div
          className={`admin-inline-banner admin-inline-banner--${banner.tone}`}
          role="status"
          aria-live="polite"
        >
          {banner.text}
        </div>
      )}

      <section className="admin-section">
        <div className="panel-glass admin-attendance">
          <div className="admin-panel-header">
            <h2>Attendance snapshot</h2>
            <span className="muted">Live view for {formatDateInTR(new Date().toISOString())}</span>
          </div>

          <div className="attendance-summary">
            <div>
              <span className="label">Booked desks</span>
              <strong>{attendanceSummary.total}</strong>
            </div>
            <div>
              <span className="label">Checked in</span>
              <strong>{attendanceSummary.checkedIn}</strong>
            </div>
            <div>
              <span className="label">Checked out</span>
              <strong>{attendanceSummary.checkedOut}</strong>
            </div>
            <div>
              <span className="label">Awaiting arrival</span>
              <strong>{attendanceSummary.pending}</strong>
            </div>
          </div>

          <div className="attendance-overdue">
            <h3>Overdue check-ins</h3>
            {overdueCheckins.length === 0 ? (
              <p className="muted">Everyone scheduled so far has checked in.</p>
            ) : (
              <ul>
                {overdueCheckins.map((reservation) => {
                  const deskLabel =
                    reservation.deskCode ?? deskById.get(reservation.deskId)?.deskCode ?? `Desk ${reservation.deskId}`;
                  const occupantLabel = reservation.user
                    ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
                    : `User #${reservation.userId}`;
                  return (
                    <li key={reservation.bookingId}>
                      <div className="primary">
                        <strong>{deskLabel}</strong>
                        <span>{isoToHHMMInTR(reservation.bookingStart)} – {isoToHHMMInTR(reservation.bookingEnd)}</span>
                      </div>
                      <div className="secondary">
                        <span>{occupantLabel}</span>
                        <span>Start passed — tap actions to follow up.</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-grid">
          <div className="panel-glass admin-floor" data-desk-context>
          <div className="admin-panel-header">
            <h2>Workspace heatmap</h2>
            <span className="muted">
              Based on the last {HEATMAP_LOOKBACK_DAYS} days of reservations.
            </span>
            <button
              type="button"
              className="btn btn-ghost heatmap-toggle"
              onClick={() => setShowHeatmap((prev) => !prev)}
            >
              {showHeatmap ? "Hide heatmap" : "Show heatmap"}
            </button>
          </div>
          <FloorPlan
            desks={viewDesks}
            selectedId={selectedDeskId}
            onSelect={setSelectedDeskId}
            onClearSelection={() => setSelectedDeskId(null)}
            showHeatmap={showHeatmap}
            workspaceHeat={workspaceHeat}
          />
        </div>

          <aside className="panel-glass admin-side" data-desk-context>
            <div className="desk-insight">
              <div className="desk-insight__header">
                <div>
                  <span className="desk-insight__eyebrow">Desk insights</span>
                  <p className="desk-insight__hint">
                    Select a desk on the map to review bookings and equipment.
                  </p>
                </div>
                {selectedDeskId && (
                  <button
                    type="button"
                    className="desk-insight__clear btn btn-ghost"
                    onClick={() => setSelectedDeskId(null)}
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedDesk && statusMeta ? (
                <div className="desk-insight__card">
                  <header className="desk-insight__desk">
                    <div>
                      <span className="desk-insight__badge">Workspace {selectedDesk.workspace}</span>
                      <h3>{selectedDesk.label}</h3>
                    </div>
                    <span className={`desk-insight__status desk-insight__status--${statusMeta.tone}`}>
                      {statusMeta.label}
                    </span>
                  </header>

                  <p className="desk-insight__status-note">{statusMeta.helper}</p>

                  <dl className="desk-insight__stats">
                    <div>
                      <dt>Bookings today</dt>
                      <dd>{reservationsForDesk.length}</dd>
                    </div>
                  </dl>

                  <section className="desk-insight__section">
                    <h4>Facilities</h4>
                    {selectedDeskDetails.facilities.length > 0 ? (
                      <ul className="desk-insight__chips">
                        {selectedDeskDetails.facilities.map((facility) => {
                          const meta = describeFacility(facility);
                          return (
                            <li key={facility}>
                              <span className="desk-insight__chip-icon" aria-hidden>
                                {meta.icon}
                              </span>
                              {meta.label}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="muted">No facility data captured for this desk.</p>
                    )}
                  </section>

                  <section className="desk-insight__section">
                    <h4>Today's bookings</h4>
                    {reservationsForDesk.length > 0 ? (
                      <ul className="desk-insight__bookings">
                        {reservationsForDesk.map((reservation) => (
                          <li key={reservation.bookingId}>
                            <strong>
                              {reservation.user
                                ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
                                : "Reserved"}
                            </strong>
                            <span className="desk-insight__booking-time">
                              {isoToHHMMInTR(reservation.bookingStart)} – {isoToHHMMInTR(reservation.bookingEnd)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No reservations for {selectedDesk.label} on {dateLabel}.</p>
                    )}
                  </section>
                </div>
              ) : (
                <div className="desk-insight__empty">
                  <h3>Pick a desk to explore</h3>
                  <p>Tap any desk on the map to inspect bookings and equipment.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="admin-section">
        <div className="panel-glass admin-upcoming">
          <div className="admin-panel-header">
            <h2>Upcoming demand</h2>
            <span className="muted">Bookings scheduled for the next 7 days</span>
          </div>
          <ul className="admin-upcoming-list">
            {upcomingDemand.map(({ label, count }) => (
              <li key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="admin-section">
        <div className="panel-glass admin-workspace-teams">
          <div className="admin-panel-header">
            <h2>Workspace team assignments</h2>
            <span className="muted">
              Tag a workspace with the team that usually sits there to coordinate seating plans.
            </span>
          </div>

          {teamNotice && (
            <div className="admin-alert admin-alert--success" role="status">
              {teamNotice}
            </div>
          )}

          {workspaceAssignments.length === 0 ? (
            <p className="muted">No workspace metadata available.</p>
          ) : (
            <ul className="workspace-team-list">
              {workspaceAssignments.map((workspace) => {
                const draft = teamDrafts[workspace.workspaceId] ?? "";
                const trimmedDraft = draft.trim();
                const trimmedStored = (workspace.teamName ?? "").trim();
                const hasChanges = trimmedDraft !== trimmedStored;
                const canClear = trimmedDraft.length > 0 || trimmedStored.length > 0;
                const isSaving = savingWorkspaceId === workspace.workspaceId;

                return (
                  <li key={workspace.workspaceId} className="workspace-team-row">
                    <div className="workspace-team-copy">
                      <strong>Workspace {workspace.workspaceName}</strong>
                      <span className="muted">
                        Desk code {workspace.deskCode} · Capacity {workspace.capacity}
                      </span>
                    </div>
                    <div className="workspace-team-actions">
                      <input
                        className="input"
                        type="text"
                        value={draft}
                        placeholder="Team name (optional)"
                        onChange={(event) =>
                          handleTeamDraftChange(workspace.workspaceId, event.target.value)
                        }
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSaveTeam(workspace.workspaceId)}
                        disabled={!hasChanges || isSaving}
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleClearTeam(workspace.workspaceId)}
                        disabled={!canClear || isSaving}
                      >
                        Clear
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="admin-section">
        <div className="panel-glass admin-table">
          <div className="admin-panel-header">
            <h2>Bookings for {dateLabel}</h2>
            <span className="muted">Showing up to {MAX_RECENT_BOOKINGS} reservations</span>
          </div>

          <div className="admin-filters">
            <label className="label" htmlFor="workspace-filter">Workspace</label>
            <select
              id="workspace-filter"
              className="input"
              value={workspaceFilter}
              onChange={(event) => setWorkspaceFilter(event.target.value)}
            >
              {workspaceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="label" htmlFor="search-filter">Search</label>
            <input
              id="search-filter"
              className="input"
              type="search"
              placeholder="Desk, workspace or employee"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setWorkspaceFilter("All");
                setSearchTerm("");
              }}
              disabled={workspaceFilter === "All" && searchTerm.trim() === ""}
            >
              Clear filters
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportCsv}
              disabled={filteredReservations.length === 0}
            >
              Export CSV
            </button>
          </div>

          {isLoading ? (
            <p className="muted">Loading reservations…</p>
          ) : reservationsForDate.length === 0 ? (
            <p className="muted">No bookings recorded for this date.</p>
          ) : filteredReservations.length === 0 ? (
            <p className="muted">No bookings match the current filters.</p>
          ) : (
            <table className="admin-bookings">
              <thead>
                <tr>
                  <th>Desk</th>
                  <th>Workspace</th>
                  <th>Employee</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.slice(0, MAX_RECENT_BOOKINGS).map((reservation) => {
                  const summary = deskById.get(reservation.deskId);
                  const deskCode = summary?.deskCode ?? `Desk ${reservation.deskId}`;
                  const workspace = workspaceFromDesk(summary?.deskCode);
                  const normalizedStatus = reservation.status?.trim().toLowerCase();
                  const isReservationToday =
                    isoDateKeyInTR(reservation.bookingStart) === todayKey;
                  const statusLabel = formatReservationStatus(reservation.status);
                  const isCheckinInFlight = checkinBusyId === reservation.bookingId;
                  const isCheckoutInFlight = checkoutBusyId === reservation.bookingId;
                  const checkinDisabled =
                    !isReservationToday ||
                    isCheckinInFlight ||
                    isCheckoutInFlight ||
                    normalizedStatus === "checkedin" ||
                    normalizedStatus === "checkedout";
                  const checkoutDisabled =
                    !isReservationToday ||
                    isCheckoutInFlight ||
                    isCheckinInFlight ||
                    normalizedStatus === "checkedout";
                  const checkinLabel = isCheckinInFlight
                    ? "Checking in…"
                    : normalizedStatus === "checkedin"
                      ? "Checked in"
                      : "Check in";
                  const checkoutLabel = isCheckoutInFlight
                    ? "Checking out…"
                    : normalizedStatus === "checkedout"
                      ? "Checked out"
                      : "Check out";
                  const isConfirming = confirmAction?.reservation.bookingId === reservation.bookingId;
                  const checkinTitle = checkinDisabled && !isReservationToday
                    ? "Check-in is only available on the reservation day."
                    : undefined;
                  const checkoutTitle = checkoutDisabled && !isReservationToday
                    ? "Check-out is only available on the reservation day."
                    : undefined;
                  return (
                    <tr key={reservation.bookingId}>
                      <td>{deskCode}</td>
                      <td>{workspace || "—"}</td>
                      <td>
                        {reservation.user
                          ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
                          : "Unknown"}
                      </td>
                      <td>
                        {isoToHHMMInTR(reservation.bookingStart)} – {isoToHHMMInTR(reservation.bookingEnd)}
                      </td>
                      <td>
                        <span className="admin-bookings__status" data-status={normalizedStatus ?? ""}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <div className="admin-bookings__actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => requestCheckin(reservation)}
                            disabled={checkinDisabled || isConfirming}
                            title={checkinTitle}
                          >
                            {checkinLabel}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => requestCheckout(reservation)}
                            disabled={checkoutDisabled || isConfirming}
                            title={checkoutTitle}
                          >
                            {checkoutLabel}
                          </button>
                        </div>
                        {!isReservationToday && (
                          <p className="admin-bookings__hint">Actions unlock on the reservation day (TR time).</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.kind === "checkin" ? "Confirm check-in" : "Confirm check-out"}
        message={confirmAction ? `You are ${confirmAction.kind === "checkin" ? "checking in to" : "checking out of"} ${confirmAction.deskLabel}. Are you sure?` : ""}
        confirmLabel={confirmAction?.kind === "checkin" ? "Yes, check in" : "Yes, check out"}
        cancelLabel="Cancel"
        busy={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmAction(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  accent?: string;
};

function MetricCard({ label, value, caption, accent }: MetricCardProps) {
  const style = accent ? ({ "--metric-accent": accent } as CSSProperties) : undefined;

  return (
    <article className="metric-card" style={style}>
      <div className="metric-card__heading">
        <span className="metric-card__indicator" aria-hidden />
        <span className="metric-card__label">{label}</span>
      </div>
      <span className="metric-card__value">{value}</span>
      {caption && <span className="metric-card__caption">{caption}</span>}
    </article>
  );
}

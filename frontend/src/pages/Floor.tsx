import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import axios from "axios";
import FloorPlan, { type DeskStatus, type LegendKey } from "../components/FloorPlan";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import {
  listDesks,
  listFacilities,
  fetchDeskSuggestions,
  type DeskSummary,
  type DeskSuggestionItem,
  type DeskSuggestionRequestPayload,
  type DeskSuggestionResponsePayload,
  type FacilityResponse,
} from "../lib/api";
import {
  getAllReservations,
  makeReservation,
  checkoutReservation,
  checkinReservation,
  type Reservation,
} from "../lib/reservations";
import {
  WORKSPACES,
  generateDeskLayout,
  toMinutes,
  isoToHHMMInTR,
  isoDateKeyInTR,
  formatDateInTR,
  normalizeDeskCode,
  mapDeskStatus,
  describeFacility,
} from "../lib/floorUtils";
import { addCheckoutRecord, loadCancellationRecords } from "../lib/notificationStore";

const WORK_START = "09:00";
const WORK_END = "18:00";
const STEP_MINUTES = 1;
const CHECKIN_WINDOW_BEFORE_MINUTES = 30;
const CHECKIN_WINDOW_AFTER_MINUTES = 30;
const CHECKOUT_WINDOW_BEFORE_MINUTES = 30;
const CHECKOUT_WINDOW_AFTER_MINUTES = 60;
const NOW_REFRESH_INTERVAL_MS = 30_000;
const MINUTE_IN_MS = 60_000;

const INACTIVE_RESERVATION_STATUSES = new Set(["checkedout", "cancelled", "completed"]);

function isReservationActive(reservation: Reservation): boolean {
  const status = reservation.status?.trim().toLowerCase();
  if (!status) return true;
  return !INACTIVE_RESERVATION_STATUSES.has(status);
}

const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type SummaryMetrics = {
  total: number;
  mine: number;
  others: number;
  available: number;
};

type LegendItem = {
  key: LegendKey;
  label: string;
  swatch: string;
};

type SuggestionMeta = {
  focusPreference?: string | null;
  focusPreferenceInferred?: boolean;
  teamName?: string | null;
  teamPresenceCount: number;
  teamPresenceSample: string[];
  generatedAt?: string;
};

type ConfirmAction = {
  kind: "checkin" | "checkout";
  reservation: Reservation;
  deskLabel: string;
};

type MetricCardProps = {
  label: string;
  value: number | string;
  accent?: string;
  description?: string;
};

function formatWindowLabel(startMs: number | null, endMs: number | null): string | null {
  if (typeof startMs !== "number" || typeof endMs !== "number") return null;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  return `${isoToHHMMInTR(startIso)} – ${isoToHHMMInTR(endIso)}`;
}

const LEGEND: LegendItem[] = [
  { key: "byMe", label: "My reservations", swatch: "#69a7ff" },
  { key: "booked", label: "Booked by others", swatch: "#f87171" },
  { key: "available", label: "Available", swatch: "#34d399" },
  { key: "unavailable", label: "Unavailable", swatch: "#9ca3af" },
];

const STATUS_LABELS: Record<LegendKey, string> = {
  byMe: "Reserved by you",
  booked: "Booked",
  available: "Available",
  unavailable: "Filtered",
};


export default function Floor() {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? 0;

  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.localStorage.getItem("floor:guide-dismissed");
  });

  const baseLayout = useMemo(generateDeskLayout, []);
  const today = useMemo(() => isoDateKeyInTR(new Date().toISOString()), []);

  const [deskSummaries, setDeskSummaries] = useState<DeskSummary[]>([]);
  const [facilityCatalog, setFacilityCatalog] = useState<FacilityResponse[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [date, setDate] = useState(today);
  const [start, setStart] = useState(WORK_START);
  const [end, setEnd] = useState(WORK_END);
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string>(() => WORKSPACES[0]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutBusyId, setCheckoutBusyId] = useState<number | null>(null);
  const [checkinBusyId, setCheckinBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<DeskSuggestionItem[]>([]);
  const [suggestionMeta, setSuggestionMeta] = useState<SuggestionMeta | null>(null);
  const [suggestionKey, setSuggestionKey] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const currentSuggestionKey = useMemo(() => `${date}|${start}|${end}`, [date, start, end]);
  const suggestionsStale = suggestionKey !== null && suggestionKey !== currentSuggestionKey;
  const toastTimeoutRef = useRef<number | null>(null);
  const lastCancellationToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const intervalId = window.setInterval(updateNow, NOW_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const selectedDateBanner = useMemo(() => {
    const parsed = parseLocalDate(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  }, [date]);

  const loadFloorData = useCallback(async () => {
    try {
      const [desks, bookings, facilities] = await Promise.all([
        listDesks(),
        getAllReservations(),
        listFacilities(),
      ]);
      setDeskSummaries(desks);
      setReservations(bookings);
      setFacilityCatalog(facilities);
    } catch (err) {
      console.error("Failed to load floor data", err);
      setError("We could not load the floor information. Please refresh.");
    }
  }, []);

  useEffect(() => {
    void loadFloorData();
  }, [loadFloorData]);

  const changeDateBy = (delta: number) => {
    setDate((prev) => {
      const base = prev ? parseLocalDate(prev) : parseLocalDate(today);
      base.setDate(base.getDate() + delta);
      return formatLocalDate(base);
    });
  };

  const deskLookup = useMemo(() => {
    const map = new Map<string, DeskSummary>();
    deskSummaries.forEach((summary) => {
      map.set(normalizeDeskCode(summary.deskCode), summary);
    });
    return map;
  }, [deskSummaries]);

  const deskSummaryById = useMemo(() => {
    const map = new Map<number, DeskSummary>();
    deskSummaries.forEach((summary) => {
      map.set(summary.deskId, summary);
    });
    return map;
  }, [deskSummaries]);

  const reservationsByDesk = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    reservations.forEach((reservation) => {
      if (!isReservationActive(reservation)) return;
      const startIso = reservation.bookingStart ?? "";
      if (!startIso.startsWith(date)) return;

      if (!map.has(reservation.deskId)) {
        map.set(reservation.deskId, []);
      }
      map.get(reservation.deskId)!.push(reservation);
    });

    map.forEach((list) =>
      list.sort((a, b) => a.bookingStart.localeCompare(b.bookingStart))
    );

    return map;
  }, [reservations, date]);

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

    const sanitizeSegment = (segment: string): string => {
      if (!segment) return "";
      let cleaned = segment
        .replace(/^[\-\u2013\u2014•]\s*/, "")
        .replace(/\s+/g, " ")
        .trim();

      cleaned = cleaned
        .replace(/^(?:workspace\s*)?[A-Z]{1,2}\s*[-\/]?\s*\d+\s*(?:desk|equipment)?\s*:?/i, "")
        .trim();
      cleaned = cleaned.replace(/^equipment\s*:?/i, "").trim();
      cleaned = cleaned.replace(/^desk\s*:?/i, "").trim();
      cleaned = cleaned.replace(/^facilities\s*:?/i, "").trim();
      cleaned = cleaned.replace(/for\s+desk\s+[A-Z]{1,2}[-\s]?\d+.*/i, "").trim();
      cleaned = cleaned.replace(/\.+$/, "").trim();

      cleaned = cleaned.replace(/[\u2013\u2014]/g, "-");
      cleaned = cleaned.replace(/\s*-\s*/g, " - ");

      if (/^no description/i.test(cleaned)) return "";
      if (/^no equipment/i.test(cleaned)) return "";
      if (/^(available|reserved)/i.test(cleaned)) return "";
      if (/^n\/?a$/i.test(cleaned)) return "";

      return cleaned.trim();
    };

    facilityCatalog.forEach((facility) => {
      if (!facility.name) return;
      const key = normalizeDeskCode(facility.name);
      if (!key) return;

      const bucket = map.get(key) ?? [];
      const source = facility.description ?? "";
      const segments = source
        .split(/[\r\n•,;]+/)
        .map((segment) => sanitizeSegment(segment))
        .filter(Boolean);

      if (segments.length > 0) {
        segments.forEach((segment) => pushUnique(bucket, segment));
      } else {
        const fallback = sanitizeSegment(source);
        if (fallback) pushUnique(bucket, fallback);
      }

      // Include the original description if none of the segments survived.
      if (bucket.length === 0 && source) {
        const fallback = sanitizeSegment(source);
        if (fallback) pushUnique(bucket, fallback);
      }

      if (bucket.length === 0) {
        const nameFallback = sanitizeSegment(facility.name ?? "");
        if (nameFallback) pushUnique(bucket, nameFallback);
      }

      if (!map.has(key)) {
        map.set(key, bucket);
      }
    });

    return map;
  }, [facilityCatalog]);

  const viewDesks: Array<
    DeskStatus & {
      reservations: Array<{ occupant?: string; range?: string }>;
      facilities: string[];
      facilityKeys: string[];
      facilityMeta: Array<{ label: string; icon: string }>;
    }
  > = useMemo(() => {
    return baseLayout.map((desk) => {
      const summary = deskLookup.get(desk.id);
      const deskId = summary?.deskId;
      const baseStatus: LegendKey = summary ? mapDeskStatus(summary.status) : "available";
      let status = baseStatus;
      const reservationsForDesk = (deskId ? reservationsByDesk.get(deskId) : undefined) ?? [];

      const deskKey = normalizeDeskCode(summary?.deskCode ?? desk.id);
      const facilityStrings = summary?.facilities?.length
        ? summary.facilities
        : deskKey
          ? facilityLookup.get(deskKey) ?? []
          : [];

      const facilityMetaMap = new Map<string, { label: string; icon: string }>();
      facilityStrings.forEach((value) => {
        const meta = describeFacility(value);
        const label = meta.label.trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (!facilityMetaMap.has(key)) {
          facilityMetaMap.set(key, { label, icon: meta.icon });
        }
      });

      const facilityMeta = Array.from(facilityMetaMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      const facilityLabels = facilityMeta.map((meta) => meta.label);
      const facilityKeys = facilityLabels.map((label) => label.toLowerCase());

      if (deskId) {
        const mine = reservationsForDesk.some((reservation) => reservation.userId === currentUserId);
        const others = reservationsForDesk.some((reservation) => reservation.userId !== currentUserId);

        if (mine) status = "byMe";
        else if (others) status = "booked";
      }

      return {
        ...desk,
        status,
        reservations: reservationsForDesk.map((reservation) => ({
          occupant: reservation.user
            ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
            : undefined,
          range: `${isoToHHMMInTR(reservation.bookingStart)} – ${isoToHHMMInTR(reservation.bookingEnd)}`,
        })),
        facilities: facilityLabels,
        facilityKeys,
        facilityMeta,
      } satisfies DeskStatus & {
        reservations: Array<{ occupant?: string; range?: string }>;
        facilities: string[];
        facilityKeys: string[];
        facilityMeta: Array<{ label: string; icon: string }>;
      };
    });
  }, [
    baseLayout,
    deskLookup,
    reservationsByDesk,
    currentUserId,
    facilityLookup,
  ]);

  const selectedDesk = useMemo(
    () => (selectedDeskId ? viewDesks.find((desk) => desk.id === selectedDeskId) ?? null : null),
    [viewDesks, selectedDeskId]
  );

  const workspaceDeskGroups = useMemo(() => {
    return WORKSPACES.map((workspace) => {
      const desks = viewDesks
        .filter((desk) => desk.workspace === workspace)
        .map((desk) => {
          const summary = deskLookup.get(desk.id);
          const deskCode = summary?.deskCode ?? desk.label;
          return {
            id: desk.id,
            deskCode,
            status: desk.status,
            facilityMeta: desk.facilityMeta,
            reservations: desk.reservations,
          };
        })
        .sort((a, b) => a.deskCode.localeCompare(b.deskCode));

      const available = desks.filter((desk) => desk.reservations.length === 0).length;

      return {
        workspace,
        desks,
        available,
        total: desks.length,
      };
    });
  }, [viewDesks, deskLookup]);

  const workspaceOrder = useMemo(
    () => workspaceDeskGroups.map((group) => group.workspace),
    [workspaceDeskGroups]
  );

  const totalWorkspaces = workspaceOrder.length;
  const activeWorkspaceIndex = activeWorkspace && totalWorkspaces > 0
    ? workspaceOrder.indexOf(activeWorkspace)
    : -1;
  const fallbackWorkspaceIndex = activeWorkspaceIndex >= 0 ? activeWorkspaceIndex : 0;
  const activeWorkspaceGroup = totalWorkspaces > 0
    ? workspaceDeskGroups[fallbackWorkspaceIndex]
    : undefined;

  useEffect(() => {
    if (totalWorkspaces === 0) return;
    if (!activeWorkspace || !workspaceOrder.includes(activeWorkspace)) {
      setActiveWorkspace(workspaceOrder[0]);
    }
  }, [activeWorkspace, workspaceOrder, totalWorkspaces]);

  const selectedWorkspace = selectedDesk?.workspace;
  useEffect(() => {
    if (!selectedWorkspace || totalWorkspaces === 0) return;
    if (selectedWorkspace !== activeWorkspace) {
      setActiveWorkspace(selectedWorkspace);
    }
  }, [selectedWorkspace, totalWorkspaces, activeWorkspace]);

  const goToPreviousWorkspace = useCallback(() => {
    if (totalWorkspaces === 0) return;
    setActiveWorkspace((current) => {
      const currentIndex = current ? workspaceOrder.indexOf(current) : 0;
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeIndex - 1 + workspaceOrder.length) % workspaceOrder.length;
      return workspaceOrder[nextIndex];
    });
  }, [workspaceOrder, totalWorkspaces]);

  const goToNextWorkspace = useCallback(() => {
    if (totalWorkspaces === 0) return;
    setActiveWorkspace((current) => {
      const currentIndex = current ? workspaceOrder.indexOf(current) : 0;
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeIndex + 1) % workspaceOrder.length;
      return workspaceOrder[nextIndex];
    });
  }, [workspaceOrder, totalWorkspaces]);

  const availabilityDetails = useMemo(() => {
    const available: string[] = [];
    const mine: { label: string; range: string }[] = [];
    const others: { label: string; occupant: string; range: string }[] = [];

    viewDesks.forEach((desk) => {
      const summary = deskLookup.get(desk.id);
      if (!summary) return;
      const reservations = reservationsByDesk.get(summary.deskId) ?? [];

      if (reservations.length === 0) {
        available.push(desk.label);
        return;
      }

      const rangeOf = (reservation: Reservation) =>
        `${isoToHHMMInTR(reservation.bookingStart)} – ${isoToHHMMInTR(reservation.bookingEnd)}`;

      reservations.forEach((reservation) => {
        const label = desk.label;
        if (reservation.userId === currentUserId) {
          mine.push({ label, range: rangeOf(reservation) });
        } else {
          const occupant = reservation.user
            ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
            : "Colleague";
          others.push({ label, occupant, range: rangeOf(reservation) });
        }
      });
    });

    available.sort();
    mine.sort((a, b) => a.label.localeCompare(b.label));
    others.sort((a, b) => a.label.localeCompare(b.label));

    return { available, mine, others };
  }, [viewDesks, deskLookup, reservationsByDesk, start, end, currentUserId]);

  const summaryMetrics: SummaryMetrics = useMemo(() => {
    const total = baseLayout.length;
    return {
      total,
      mine: availabilityDetails.mine.length,
      others: availabilityDetails.others.length,
      available: availabilityDetails.available.length,
    };
  }, [baseLayout, availabilityDetails]);

  const mostUsedDesk = useMemo(() => {
    if (currentUserId === 0 || reservations.length === 0) {
      return null;
    }

    const counter = new Map<number, { count: number; label: string; workspaceName?: string | null }>();

    reservations.forEach((reservation) => {
      if (!isReservationActive(reservation)) {
        return;
      }

      if (reservation.userId !== currentUserId) {
        return;
      }

      const summary = deskSummaryById.get(reservation.deskId);
      const label = summary?.deskCode ?? `Desk ${reservation.deskId}`;
      const workspaceName = summary?.workspaceName ?? summary?.deskCode?.match(/^[A-Z]+/)?.[0] ?? null;

      const existing = counter.get(reservation.deskId);
      if (existing) {
        existing.count += 1;
      } else {
        counter.set(reservation.deskId, { count: 1, label, workspaceName });
      }
    });

    let topDeskId: number | null = null;
    let topCount = 0;

    counter.forEach((value, deskId) => {
      if (value.count > topCount) {
        topCount = value.count;
        topDeskId = deskId;
      }
    });

    if (topDeskId == null) {
      return null;
    }

    const topMeta = counter.get(topDeskId);
    return topMeta
      ? {
          deskId: topDeskId,
          label: topMeta.label,
          workspaceName: topMeta.workspaceName,
          count: topMeta.count,
        }
      : null;
  }, [reservations, currentUserId, deskSummaryById]);

  const heroMetrics = useMemo(() => {
    const scheduleDescriptor = selectedDateBanner || "the selected date";

    const metrics: MetricCardProps[] = [
      {
        label: "Total desks",
        value: summaryMetrics.total,
        accent: "#003a5d",
        description: "Active across every workspace zone on this floor plan.",
      },
      {
        label: "Available today",
        value: summaryMetrics.available,
        accent: "#2EBD85",
        description: `Free to reserve for ${scheduleDescriptor}.`,
      },
      {
        label: "Booked by others",
        value: summaryMetrics.others,
        accent: "#f87171",
        description: `Reserved by colleagues for ${scheduleDescriptor}.`,
      },
      {
        label: "Mine",
        value: summaryMetrics.mine,
        accent: "#69a7ff",
        description: "Your confirmed reservations in this window.",
      },
    ];

    if (mostUsedDesk) {
      const usageSnippet = `Reserved ${mostUsedDesk.count} ${
        mostUsedDesk.count === 1 ? "time" : "times"
      } recently`;
      const zoneSnippet = mostUsedDesk.workspaceName
        ? `Located in ${mostUsedDesk.workspaceName}`
        : null;

      metrics.push({
        label: "Most used desk",
        value: mostUsedDesk.label,
        accent: "#7F5AF0",
        description: zoneSnippet ? `${usageSnippet} · ${zoneSnippet}` : usageSnippet,
      });
    }

    return metrics;
  }, [summaryMetrics, mostUsedDesk, selectedDateBanner]);

  const heroChips = useMemo(() => {
    const chips: string[] = [];
    const zoneLabel = selectedDesk?.workspace ?? mostUsedDesk?.workspaceName ?? activeWorkspace;
    chips.push(zoneLabel ? `Active zone: ${zoneLabel}` : "All workspaces");
    chips.push(`${summaryMetrics.available.toString()} free desk${summaryMetrics.available === 1 ? "" : "s"}`);

    if (mostUsedDesk) {
      chips.push(`Most used: ${mostUsedDesk.label}`);
    }

    if (suggestionMeta?.focusPreference) {
      const modifier = suggestionMeta.focusPreferenceInferred ? "Suggested" : "Preferred";
      chips.push(`${modifier}: ${suggestionMeta.focusPreference}`);
    } else if (!mostUsedDesk && selectedDesk?.facilities.length) {
      chips.push(`${selectedDesk.facilities[0]} ready`);
    }

    return chips.slice(0, 3);
  }, [activeWorkspace, selectedDesk, summaryMetrics.available, suggestionMeta, mostUsedDesk]);

  const myReservationsForSelectedDate = useMemo(() => {
    const target = date;
    return reservations
      .filter((reservation) => reservation.userId === currentUserId)
      .filter((reservation) => isReservationActive(reservation))
      .filter((reservation) => {
        const start = reservation.bookingStart ?? "";
        if (!start) return false;
        return start.startsWith(target);
      })
      .sort((a, b) => a.bookingStart.localeCompare(b.bookingStart));
  }, [reservations, currentUserId, date]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }, []);

  const notifyCancellationIfNeeded = useCallback(() => {
    if (!user) return false;
    const records = loadCancellationRecords();
    if (!records.length) return false;
    const mine = records.find((record) => record.userId === currentUserId);
    if (!mine) return false;
    const key = `${mine.bookingId}-${mine.recordedAt}`;
    if (lastCancellationToastRef.current === key) return false;
    lastCancellationToastRef.current = key;

    const deskLabel = mine.deskCode ?? `Desk #${mine.bookingId}`;
    const message = mine.reason === "auto-missed-checkin"
      ? `${deskLabel} was cancelled after the check-in window closed.`
      : mine.reason === "user"
        ? `You cancelled ${deskLabel}.`
        : `${deskLabel} was cancelled by an administrator.`;

    showToast(message);
    return true;
  }, [currentUserId, showToast, user]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const handleCancellation = () => {
      const notified = notifyCancellationIfNeeded();
      if (notified) {
        void loadFloorData();
      }
    };

    window.addEventListener("notifications:cancellations", handleCancellation);
    return () => {
      window.removeEventListener("notifications:cancellations", handleCancellation);
    };
  }, [loadFloorData, notifyCancellationIfNeeded, user]);

  useEffect(() => {
    if (!user) return;
    const records = loadCancellationRecords();
    const mine = records.find((record) => record.userId === currentUserId);
    if (mine) {
      lastCancellationToastRef.current = `${mine.bookingId}-${mine.recordedAt}`;
    }
  }, [currentUserId, user]);

  useEffect(() => {
    if (!user) return;
    notifyCancellationIfNeeded();
  }, [notifyCancellationIfNeeded, reservations, user]);

  const handleDismissGuide = () => {
    setShowGuide(false);
    try {
      window.localStorage.setItem("floor:guide-dismissed", "1");
    } catch (err) {
      console.warn("Failed to persist guide dismissal", err);
    }
  };

  const applySuggestion = useCallback(
    (suggestion: DeskSuggestionItem, options?: { announce?: boolean }) => {
      let target = viewDesks.find((desk) => {
        const summary = deskLookup.get(desk.id);
        return summary?.deskId === suggestion.deskId;
      }) ?? null;

      if (!target) {
        const summary = deskSummaryById.get(suggestion.deskId);
        if (summary) {
          const normalized = normalizeDeskCode(summary.deskCode);
          target =
            viewDesks.find((desk) => normalizeDeskCode(desk.label) === normalized) ??
            null;
        }
      }

      if (!target) {
        return;
      }

      setSelectedDeskId(target.id);
      if (options?.announce !== false) {
        showToast(`Selected ${target.label} from smart suggestions.`);
      }
    },
    [deskLookup, deskSummaryById, showToast, viewDesks]
  );

  const handleSmartSuggestion = useCallback(async () => {
    if (!isSuggesting && smartSuggestions.length > 0 && !suggestionsStale) {
      setSmartSuggestions([]);
      setSuggestionMeta(null);
      setSuggestionKey(null);
      setSuggestionError(null);
      return;
    }

    if (!user) {
      setSuggestionError("Please sign in to get smart suggestions.");
      return;
    }

    const startDateTime = new Date(`${date}T${start}:00`);
    const endDateTime = new Date(`${date}T${end}:00`);

    if (!(startDateTime < endDateTime)) {
      setSuggestionError("Choose an end time that is after the start time.");
      return;
    }

    setIsSuggesting(true);
    setSuggestionError(null);

    try {
      let workspaceId: number | undefined;

      if (selectedDesk) {
        const summary = deskLookup.get(selectedDesk.id);
        workspaceId = summary?.workspaceId;
      }

      if (!workspaceId && activeWorkspaceGroup) {
        const targetWorkspace = activeWorkspaceGroup.workspace.toUpperCase();
        const candidate = deskSummaries.find((summary) => {
          const label = summary.workspaceName?.toUpperCase();
          if (label) return label === targetWorkspace;
          const normalized = normalizeDeskCode(summary.deskCode);
          return normalized.startsWith(targetWorkspace);
        });
        workspaceId = candidate?.workspaceId;
      }

      const desiredFacilities = selectedDesk?.facilities?.slice(0, 6);

      const payload: DeskSuggestionRequestPayload = {
        userId: currentUserId,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        limit: 4,
      };

      if (workspaceId) {
        payload.workspaceId = workspaceId;
      }

      if (desiredFacilities && desiredFacilities.length > 0) {
        payload.desiredFacilities = desiredFacilities;
      }

      const response: DeskSuggestionResponsePayload = await fetchDeskSuggestions(payload);

      let suggestions = [...response.suggestions];

      if (mostUsedDesk) {
        const existingIndex = suggestions.findIndex((item) => item.deskId === mostUsedDesk.deskId);

        if (existingIndex > 0) {
          const [fav] = suggestions.splice(existingIndex, 1);
          suggestions.unshift(fav);
        } else if (existingIndex === -1) {
          const summary = deskSummaryById.get(mostUsedDesk.deskId);
          if (summary) {
            const fallback: DeskSuggestionItem = {
              deskId: summary.deskId,
              deskCode: summary.deskCode,
              workspaceId: summary.workspaceId,
              workspaceName: summary.workspaceName ?? mostUsedDesk.workspaceName ?? undefined,
              facilities: summary.facilities ?? [],
              score: (suggestions[0]?.score ?? 10) + 1,
              reasons: ["Your most booked desk based on past reservations."],
              confidence: 1,
              teammateCount: 0,
              teammateNames: [],
              focusMode: summary.focusMode,
              noiseLevel: summary.noiseLevel ?? undefined,
              focusMatch: false,
              teamAlignmentMatch: false,
            };

            suggestions.unshift(fallback);
          }
        }
      }

      setSmartSuggestions(suggestions);
      setSuggestionMeta({
        focusPreference: response.focusPreference,
        focusPreferenceInferred: response.focusPreferenceInferred,
        teamName: response.teamName,
        teamPresenceCount: response.teamPresenceCount,
        teamPresenceSample: response.teamPresenceSample,
        generatedAt: response.generatedAt,
      });
      setSuggestionKey(currentSuggestionKey);

      if (response.suggestions.length === 0) {
        setSuggestionError("No open desks match this slot right now. Try another time or workspace.");
      } else {
        setSuggestionError(null);
      }
    } catch (err) {
      console.error("Smart suggestion failed", err);
      setSuggestionError("We couldn't generate suggestions right now. Please try again in a moment.");
    } finally {
      setIsSuggesting(false);
    }
  }, [
    isSuggesting,
    smartSuggestions,
    suggestionsStale,
    user,
    date,
    start,
    end,
    selectedDesk,
    deskLookup,
    activeWorkspaceGroup,
    deskSummaries,
    currentUserId,
    currentSuggestionKey,
    mostUsedDesk,
    deskSummaryById,
  ]);

  async function handleReserve() {
    if (!user) {
      setError("Please sign in to reserve a desk.");
      return;
    }

    if (!selectedDeskId) {
      setError("Pick a desk on the map to continue.");
      return;
    }

    const deskSummary = deskLookup.get(selectedDeskId);
    if (!deskSummary) {
      setError("We couldn't find that desk in the catalog.");
      return;
    }

    if (toMinutes(start) < toMinutes(WORK_START) || toMinutes(end) > toMinutes(WORK_END)) {
      setError("Reservations must stay within 09:00 – 18:00 working hours.");
      return;
    }

    if (toMinutes(end) <= toMinutes(start)) {
      setError("End time must be later than the start time.");
      return;
    }

    const status = selectedDesk?.status;
    if (status === "booked" || status === "unavailable") {
      setError("That desk is already booked for the selected time range.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const startISO = new Date(`${date}T${start}:00+03:00`).toISOString();
      const endISO = new Date(`${date}T${end}:00+03:00`).toISOString();

      await makeReservation({
        userId: currentUserId,
        deskId: deskSummary.deskId,
        bookingDate: new Date(`${date}T00:00:00Z`).toISOString(),
        bookingStart: startISO,
        bookingEnd: endISO,
        status: "Confirmed",
      });

      await loadFloorData();
      setSelectedDeskId(null);
      showToast(`Reserved ${deskSummary.deskCode} for ${date} (${start} – ${end})`);
    } catch (err: unknown) {
      console.error("Failed to reserve desk", err);

      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError(null);
        showToast("You already have a desk for this day. Reserve one desk per day.");
        return;
      }

      const fallbackMessage = "Reservation failed. Please try again.";
      const message = axios.isAxiosError(err)
        ? (typeof err.response?.data?.message === "string" ? err.response.data.message : err.message)
        : err instanceof Error
          ? err.message
          : fallbackMessage;

      setError(message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestCheckin(reservation: Reservation) {
    const summary = deskSummaryById.get(reservation.deskId);
    const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
    setConfirmAction({ kind: "checkin", reservation, deskLabel });
  }

  function requestCheckout(reservation: Reservation) {
    const summary = deskSummaryById.get(reservation.deskId);
    const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
    setConfirmAction({ kind: "checkout", reservation, deskLabel });
  }

  async function performCheckin(reservation: Reservation) {
    if (!user) {
      setError("Please sign in to manage your reservation.");
      return;
    }

    if (!reservation.bookingId) {
      return;
    }

    setError(null);
    setCheckinBusyId(reservation.bookingId);

    const summary = deskSummaryById.get(reservation.deskId);
    const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;

    try {
      await checkinReservation({
        bookingId: reservation.bookingId,
        performedByUserId: currentUserId,
      });

      await loadFloorData();
      showToast(`Checked in to ${deskLabel}.`);
    } catch (err: unknown) {
      console.error("Failed to check in", err);

      const fallbackMessage = "Check-in failed. Please try again.";
      const message = axios.isAxiosError(err)
        ? (typeof err.response?.data?.message === "string"
            ? err.response.data.message
            : err.message)
        : err instanceof Error
          ? err.message
          : fallbackMessage;

      setError(message || fallbackMessage);
    } finally {
      setCheckinBusyId(null);
    }
  }

  async function performCheckout(reservation: Reservation) {
    if (!user) {
      setError("Please sign in to manage your reservation.");
      return;
    }

    if (!reservation.bookingId) {
      return;
    }

    setError(null);
    setCheckoutBusyId(reservation.bookingId);

    const summary = deskSummaryById.get(reservation.deskId);
    const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
    const occupantName = reservation.user
      ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
      : undefined;
    const performerName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : undefined;

    try {
      await checkoutReservation({
        bookingId: reservation.bookingId,
        performedByUserId: currentUserId,
      });

      addCheckoutRecord({
        bookingId: reservation.bookingId,
        userId: reservation.userId,
        performedByUserId: currentUserId,
        deskCode: summary?.deskCode,
        bookingDate: reservation.bookingDate,
        bookingStart: reservation.bookingStart,
        bookingEnd: reservation.bookingEnd,
        recordedAt: new Date().toISOString(),
        occupantName,
        performedByName: performerName,
      });

      await loadFloorData();
      showToast(`Checked out of ${deskLabel}.`);
    } catch (err: unknown) {
      console.error("Failed to check out", err);

      const fallbackMessage = "Checkout failed. Please try again.";
      const message = axios.isAxiosError(err)
        ? (typeof err.response?.data?.message === "string"
            ? err.response.data.message
            : err.response?.status === 403
              ? "You're not allowed to check out this reservation."
              : err.message)
        : err instanceof Error
          ? err.message
          : fallbackMessage;

      setError(message || fallbackMessage);
    } finally {
      setCheckoutBusyId(null);
    }
  }

  async function handleConfirmAction() {
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
  }

  const handleGlobalBackdropClick = useCallback(() => {
    setSelectedDeskId(null);
    setSmartSuggestions([]);
    setSuggestionMeta(null);
    setSuggestionError(null);
  }, []);

  useEffect(() => {
    if (!selectedDeskId) return;
    const exists = viewDesks.some((desk) => desk.id === selectedDeskId);
    if (!exists) {
      setSelectedDeskId(null);
    }
  }, [selectedDeskId, viewDesks]);

  return (
    <div className="floor-page" onClick={handleGlobalBackdropClick}>
      {showGuide && (
        <div className="floor-top-row" onClick={(event) => event.stopPropagation()}>
          <section className="panel-glass guide-card" role="status" aria-live="polite">
            <div>
              <h2>Quick tip</h2>
              <p className="muted">
                Pick a desk on the map to preview equipment and availability, then lock it in with the reserve button.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={handleDismissGuide}>
              Got it
            </button>
          </section>
        </div>
      )}

      {error && (
        <div className="panel-warn" role="alert" onClick={(event) => event.stopPropagation()}>
          {error}
        </div>
      )}

      <section className="panel-glass floor-hero" onClick={(event) => event.stopPropagation()}>
        <div className="floor-hero__copy">
          <span className="floor-hero__eyebrow">Workspace planning suite</span>
          <h1>Coordinate on-site work with clarity and control</h1>
          <p>
            Give your team a structured view of seating, amenities, and availability before the workday begins.
          </p>
          <div className="floor-hero__highlights" role="list">
            <div className="floor-highlight" role="listitem">
              <span className="floor-highlight__title">Structured scheduling</span>
              <span className="floor-highlight__description">
                Keep reservations within working hours and surface conflicts before they disrupt your plans.
              </span>
            </div>
            <div className="floor-highlight" role="listitem">
              <span className="floor-highlight__title">Team visibility</span>
              <span className="floor-highlight__description">
                Understand who is on-site, review equipment checklists, and align seating assignments in seconds.
              </span>
            </div>
            <div className="floor-highlight" role="listitem">
              <span className="floor-highlight__title">Insightful utilization</span>
              <span className="floor-highlight__description">
                Pair live heatmaps with occupancy trends to guide more informed workspace decisions.
              </span>
            </div>
          </div>
          {heroChips.length > 0 && (
            <div className="floor-hero__chips">
              {heroChips.map((chip) => (
                <span key={chip} className="floor-chip">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="floor-hero__metrics">
          {heroMetrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              accent={metric.accent}
            />
          ))}
        </div>
      </section>

      <section className="panel-glass floor-controls" onClick={(event) => event.stopPropagation()}>
        <header className="controls-header">
          <h2>Reservation window</h2>
          <p className="muted">Pick a date and time within the working day to explore availability and create a booking.</p>
        </header>

        <div className="controls-grid">
          <label className="control date-control">
            <span className="label">Date</span>
            <div className="date-picker">
              <button
                type="button"
                className="btn btn-ghost date-nav"
                onClick={() => changeDateBy(-1)}
                aria-label="Previous day"
              >
                ‹
              </button>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost date-nav"
                onClick={() => changeDateBy(1)}
                aria-label="Next day"
              >
                ›
              </button>
            </div>
          </label>

          <label className="control">
            <span className="label">Start</span>
            <input
              className="input"
              type="time"
              step={STEP_MINUTES * 60}
              min={WORK_START}
              max={WORK_END}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>

          <label className="control">
            <span className="label">End</span>
            <input
              className="input"
              type="time"
              step={STEP_MINUTES * 60}
              min={WORK_START}
              max={WORK_END}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>

          <button
            className="btn btn-primary reserve-btn"
            onClick={handleReserve}
            disabled={isSubmitting || !user || !selectedDeskId}
          >
            {isSubmitting ? "Reserving..." : "Reserve selected"}
          </button>
        </div>
      </section>

      <section
        className="panel-glass today-card"
        aria-live="polite"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="today-card__header">
          <h2 className="today-card__date">{selectedDateBanner}</h2>
        </header>
            {myReservationsForSelectedDate.length > 0 ? (
          <div className="today-card__body">
            {myReservationsForSelectedDate.map((reservation) => {
              const summary = deskSummaryById.get(reservation.deskId);
              const deskLabel = summary?.deskCode ?? `Desk ${reservation.deskId}`;
              const key = reservation.bookingId?.toString() ?? `${reservation.deskId}-${reservation.bookingStart}`;
              const normalizedStatus = reservation.status?.trim().toLowerCase();
              const isCheckinBusy = checkinBusyId === reservation.bookingId;
              const isCheckoutBusy = checkoutBusyId === reservation.bookingId;
              const isReservationToday =
                isoDateKeyInTR(reservation.bookingStart) === today;
              const statusLabel = (() => {
                switch (normalizedStatus) {
                  case "checkedin":
                    return "Checked in";
                  case "checkedout":
                    return "Checked out";
                  case "confirmed":
                    return "Confirmed";
                  case "pending":
                    return "Pending";
                  default:
                    return null;
                }
              })();

              const startMs = new Date(reservation.bookingStart).getTime();
              const endMs = new Date(reservation.bookingEnd).getTime();
              const checkinWindowStartMs = Number.isNaN(startMs)
                ? null
                : startMs - CHECKIN_WINDOW_BEFORE_MINUTES * MINUTE_IN_MS;
              const checkinWindowEndMs = Number.isNaN(startMs)
                ? null
                : startMs + CHECKIN_WINDOW_AFTER_MINUTES * MINUTE_IN_MS;
              const checkoutWindowStartMs = Number.isNaN(endMs)
                ? null
                : endMs - CHECKOUT_WINDOW_BEFORE_MINUTES * MINUTE_IN_MS;
              const checkoutWindowEndMs = Number.isNaN(endMs)
                ? null
                : endMs + CHECKOUT_WINDOW_AFTER_MINUTES * MINUTE_IN_MS;
              const isWithinCheckinWindow =
                typeof checkinWindowStartMs === "number" &&
                typeof checkinWindowEndMs === "number" &&
                nowMs >= checkinWindowStartMs &&
                nowMs <= checkinWindowEndMs;
              const hasCheckedIn = normalizedStatus === "checkedin";
              const isWithinCheckoutWindow =
                hasCheckedIn || (
                  typeof checkoutWindowStartMs === "number" &&
                  typeof checkoutWindowEndMs === "number" &&
                  nowMs >= checkoutWindowStartMs &&
                  nowMs <= checkoutWindowEndMs
                );
              const checkinWindowLabel = formatWindowLabel(checkinWindowStartMs, checkinWindowEndMs);
              const checkoutWindowLabel = formatWindowLabel(checkoutWindowStartMs, checkoutWindowEndMs);

              const checkinDisabledBase =
                !isReservationToday ||
                isCheckinBusy ||
                normalizedStatus === "checkedin" ||
                normalizedStatus === "checkedout";
              const checkinDisabled = checkinDisabledBase || !isWithinCheckinWindow;
              const checkoutDisabledBase =
                !isReservationToday ||
                isCheckoutBusy ||
                isCheckinBusy ||
                normalizedStatus === "checkedout";
              const checkoutDisabled = checkoutDisabledBase || !isWithinCheckoutWindow;

              const checkinTitle = (() => {
                if (!checkinDisabled) return undefined;
                if (!isReservationToday) return "Check-in is only available on the reservation day.";
                if (normalizedStatus === "checkedout") return "This reservation is already checked out.";
                if (normalizedStatus === "checkedin") return "You are already checked in.";
                if (isCheckinBusy) return "Processing your check-in...";
                if (!isWithinCheckinWindow) {
                  return checkinWindowLabel
                    ? `Check-in available between ${checkinWindowLabel} (TR time).`
                    : "Check-in opens closer to your booking time.";
                }
                return undefined;
              })();

              const checkoutTitle = (() => {
                if (!checkoutDisabled) return undefined;
                if (!isReservationToday) return "Check-out is only available on the reservation day.";
                if (normalizedStatus === "checkedout") return "This reservation is already checked out.";
                if (isCheckoutBusy) return "Processing your check-out...";
                if (isCheckinBusy) return "Finish check-in before checking out.";
                if (!isWithinCheckoutWindow) {
                  return checkoutWindowLabel
                    ? `Check-out available between ${checkoutWindowLabel} (TR time).`
                    : "Check-out opens later in your booking.";
                }
                return undefined;
              })();

              const actionMessage = (() => {
                if (!isReservationToday) {
                  const dayLabel = formatDateInTR(reservation.bookingStart);
                  return `Actions unlock ${dayLabel} at ${isoToHHMMInTR(reservation.bookingStart)} (TR time).`;
                }
                if (normalizedStatus === "checkedout") {
                  return "This reservation is already checked out.";
                }
                if (normalizedStatus === "checkedin") {
                  if (!isWithinCheckoutWindow && checkoutWindowLabel) {
                    return `Check-out window: ${checkoutWindowLabel} (TR time).`;
                  }
                  return "Checked in – have a great day on site.";
                }
                if (!isWithinCheckinWindow) {
                  return checkinWindowLabel
                    ? `Check-in window: ${checkinWindowLabel} (TR time).`
                    : "Check-in becomes available closer to your booking time.";
                }
                if (!isWithinCheckoutWindow && checkoutWindowLabel) {
                  return `Check-out window: ${checkoutWindowLabel} (TR time).`;
                }
                return "Check in on arrival so colleagues see this desk in use.";
              })();

              return (
                <div key={key} className="today-card__entry">
                  <div className="today-card__details">
                    <strong>{deskLabel}</strong>
                    <span>
                      {isoToHHMMInTR(reservation.bookingStart)} – {isoToHHMMInTR(reservation.bookingEnd)}
                    </span>
                    {statusLabel && <span className="today-card__status">{statusLabel}</span>}
                  </div>
                  <div className="today-card__actionBlock">
                    <div className="today-card__actions">
                      <button
                        type="button"
                        className="btn btn-ghost today-card__checkin"
                        onClick={() => requestCheckin(reservation)}
                        disabled={checkinDisabled}
                        title={checkinTitle}
                      >
                        {isCheckinBusy
                          ? "Checking in…"
                          : normalizedStatus === "checkedin"
                            ? "Checked in"
                            : "Check in"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost today-card__checkout"
                        onClick={() => requestCheckout(reservation)}
                        disabled={checkoutDisabled}
                        title={checkoutTitle}
                      >
                        {isCheckoutBusy ? "Checking out…" : "Check out"}
                      </button>
                    </div>
                    {actionMessage && (
                      <p className="today-card__info" role="status">{actionMessage}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="today-card__body">
            <span>No reservation booked for this day.</span>
          </div>
        )}
      </section>

      <section className="floor-content" onClick={(event) => event.stopPropagation()}>
        <div className="panel-glass floor-panel">
          <FloorPlan
            desks={viewDesks}
            selectedId={selectedDeskId}
            onSelect={setSelectedDeskId}
            onClearSelection={() => setSelectedDeskId(null)}
          />
        </div>

        <aside className="floor-sidebar">
          <div className="panel-glass floor-card smart-card">
            <div className="smart-card__header">
              <h2>Smart suggestions</h2>
              <button
                type="button"
                className="btn btn-primary smart-card__action"
                onClick={handleSmartSuggestion}
                disabled={isSuggesting || !user}
              >
                {isSuggesting ? "Analyzing..." : "Smart Suggestion"}
              </button>
            </div>
            {suggestionsStale && smartSuggestions.length > 0 && (
              <p className="smart-stale">Suggestions were generated for an earlier time. Run again to refresh.</p>
            )}
            {suggestionError && <p className="smart-error">{suggestionError}</p>}
            {!suggestionError && smartSuggestions.length === 0 ? (
              <p className="muted">
                Tap “Smart Suggestion” to let us analyse your desk history, team calendars and equipment needs.
              </p>
            ) : null}
            {smartSuggestions.length > 0 && (
              <div className="smart-card__list">
                {smartSuggestions.map((suggestion, index) => (
                  <article
                    key={suggestion.deskId}
                    className="smart-suggestion"
                    data-leading={index === 0 ? "true" : "false"}
                    data-focus={suggestion.focusMatch ? "true" : "false"}
                    data-team={suggestion.teamAlignmentMatch ? "true" : "false"}
                  >
                    <header>
                      <div className="smart-heading">
                        <span className="smart-code">{suggestion.deskCode}</span>
                        {suggestion.workspaceName && (
                          <span className="smart-zone">Zone {suggestion.workspaceName}</span>
                        )}
                      </div>
                      <span className="smart-confidence">
                        {Math.round(suggestion.confidence * 100)}% match
                      </span>
                    </header>
                    <div className="smart-tags">
                      {suggestion.focusMode && (
                        <span className="smart-tag">
                          {suggestion.focusMatch ? "Focus · " : ""}
                          {suggestion.focusMode}
                        </span>
                      )}
                      {typeof suggestion.noiseLevel === "number" && (
                        <span className="smart-tag">Noise {suggestion.noiseLevel}</span>
                      )}
                      {suggestion.teammateCount > 0 && (
                        <span className="smart-tag">
                          {suggestion.teammateCount} teammate{suggestion.teammateCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <ul className="smart-reasons">
                      {suggestion.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="btn btn-ghost smart-apply"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      Use this desk
                    </button>
                  </article>
                ))}
              </div>
            )}
            {suggestionMeta && (
              <footer className="smart-meta">
                {suggestionMeta.focusPreference && (
                  <span>
                    {suggestionMeta.focusPreferenceInferred
                      ? `Inferred preference: ${suggestionMeta.focusPreference.toLowerCase()} zones.`
                      : `Preference: ${suggestionMeta.focusPreference}`}
                  </span>
                )}
                {suggestionMeta.teamName && (
                  <span>
                    Team {suggestionMeta.teamName}
                    {suggestionMeta.teamPresenceCount > 0
                      ? ` has ${suggestionMeta.teamPresenceCount} colleague${
                          suggestionMeta.teamPresenceCount > 1 ? "s" : ""
                        } around.`
                      : " has no one booked for this slot."}
                  </span>
                )}
                {suggestionMeta.teamPresenceSample.length > 0 && (
                  <span>Nearby: {suggestionMeta.teamPresenceSample.join(", ")}</span>
                )}
              </footer>
            )}
          </div>

          <div className="panel-glass floor-card">
            <h2>Workspaces</h2>
            <p className="muted workspace-card__subtitle">
              Full overview of every desk and its equipment for the selected day.
            </p>
            {totalWorkspaces > 0 ? (
              <div className="workspace-card">
                <div className="workspace-card__header">
                  <button
                    type="button"
                    className="workspace-nav-btn"
                    aria-label="Previous workspace"
                    onClick={goToPreviousWorkspace}
                  >
                    ‹
                  </button>
                  <div className="workspace-card__title">
                    <span className="workspace-card__name">
                      {activeWorkspaceGroup ? `Workspace ${activeWorkspaceGroup.workspace}` : "Workspace"}
                    </span>
                    <span className="workspace-card__count">
                      {activeWorkspaceGroup
                        ? `${activeWorkspaceGroup.available} of ${activeWorkspaceGroup.total} available`
                        : "No desks configured"}
                    </span>
                    <span className="workspace-card__index">
                      {totalWorkspaces > 0 ? `${fallbackWorkspaceIndex + 1} / ${totalWorkspaces}` : "0 / 0"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="workspace-nav-btn"
                    aria-label="Next workspace"
                    onClick={goToNextWorkspace}
                  >
                    ›
                  </button>
                </div>
                <div className="workspace-card__stage">
                  {activeWorkspaceGroup ? (
                    activeWorkspaceGroup.desks.length > 0 ? (
                      <div
                        key={activeWorkspaceGroup.workspace}
                        className="workspace-panel"
                      >
                        <div className="workspace-desks" role="list">
                          {activeWorkspaceGroup.desks.map((desk) => {
                            const isSelected = selectedDesk?.id === desk.id;
                            const hasReservations = desk.reservations.length > 0;
                            const primaryReservation = desk.reservations[0];
                            const reservationLabel = hasReservations && primaryReservation
                              ? primaryReservation.occupant
                                ? `${primaryReservation.occupant} · ${primaryReservation.range}`
                                : `Reserved · ${primaryReservation.range}`
                              : "Available for the selected day.";

                            return (
                              <button
                                key={desk.id}
                                type="button"
                                role="listitem"
                                className="workspace-desk"
                                data-selected={isSelected ? "true" : "false"}
                                onClick={() => setSelectedDeskId(desk.id)}
                              >
                                <div className="workspace-desk__top">
                                  <span className="workspace-desk__code">{desk.deskCode}</span>
                                  <span
                                    className="workspace-desk__status"
                                    data-status={desk.status}
                                  >
                                    {STATUS_LABELS[desk.status]}
                                  </span>
                                </div>
                                {desk.facilityMeta.length > 0 && (
                                  <ul className="workspace-equip" aria-label="Equipment list">
                                    {desk.facilityMeta.map((meta) => (
                                      <li key={`${desk.id}-${meta.label}`}>
                                        <span aria-hidden>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <span className="workspace-desk__meta">{reservationLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="workspace-card__empty">No desks configured.</p>
                    )
                  ) : (
                    <p className="workspace-card__empty">No workspace data yet.</p>
                  )}
                </div>
                <div className="workspace-card__quick">
                  {workspaceDeskGroups.map((group, index) => (
                    <button
                      key={group.workspace}
                      type="button"
                      className="workspace-pill-button"
                      data-active={index === fallbackWorkspaceIndex ? "true" : "false"}
                      onClick={() => setActiveWorkspace(group.workspace)}
                      aria-label={`Show workspace ${group.workspace}`}
                    >
                      {group.workspace}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">No workspace data yet.</p>
            )}
          </div>

          <div className="panel-glass floor-card">
            <h2>Legend</h2>
            <div className="legend-list">
              {LEGEND.map(({ key, label, swatch }) => (
                <div key={key} className="legend-item">
                  <span className="legend-swatch" style={{ background: swatch }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="workspace-strip" aria-label="Workspaces">
              {WORKSPACES.map((workspace) => {
                const isActive = selectedDesk?.workspace === workspace;
                return (
                  <span
                    key={workspace}
                    className={`workspace-pill${isActive ? " active" : ""}`}
                  >
                    {workspace}
                  </span>
                );
              })}
            </div>
          </div>

        </aside>
      </section>

      {toast && (
        <div className="toast" role="status" onClick={(event) => event.stopPropagation()}>
          {toast}
        </div>
      )}

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

function MetricCard({ label, value, accent, description }: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString("en-US") : value;
  const style = accent ? ({ ["--metric-accent" as const]: accent } as CSSProperties) : undefined;

  return (
    <article className="metric-card" style={style}>
      <div className="metric-card__heading">
        <span className="metric-card__label">{label}</span>
        <span className="metric-card__accent" aria-hidden />
      </div>
      <span className="metric-card__value">{displayValue}</span>
      {description && <p className="metric-card__description">{description}</p>}
    </article>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listDesks, type DeskSummary } from "../lib/api";
import { getAllReservations, type Reservation } from "../lib/reservations";

const STEP_MINUTES = 30;
const WORK_START = "09:00";
const WORK_END = "18:00";

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

const isoToHHMMInTR = (iso: string): string => {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
};

const minutesToHHMM = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const todayDefault = formatLocalDate(new Date());

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export default function SeatsOverview() {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? 0;

  const [date, setDate] = useState(todayDefault);
  const [start, setStart] = useState(WORK_START);
  const [end, setEnd] = useState(WORK_END);

  const [deskSummaries, setDeskSummaries] = useState<DeskSummary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [desks, bookings] = await Promise.all([
        listDesks(),
        getAllReservations(),
      ]);
      setDeskSummaries(desks);
      setReservations(bookings);
    } catch (err) {
      console.error("Failed to load seat data", err);
      setError("Unable to load seat overview. Please refresh.");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changeDateBy = (delta: number) => {
    setDate((prev) => {
      const base = prev ? parseLocalDate(prev) : parseLocalDate(todayDefault);
      base.setDate(base.getDate() + delta);
      return formatLocalDate(base);
    });
  };

  const reservationsByDesk = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    reservations.forEach((reservation) => {
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

  const dayStartMinutes = toMinutes(WORK_START);
  const dayEndMinutes = toMinutes(WORK_END);
  const windowStart = Math.max(dayStartMinutes, toMinutes(start));
  const windowEnd = Math.min(dayEndMinutes, toMinutes(end));
  const seatRows = useMemo(() => {
    if (windowEnd <= windowStart) return [];

    const sortedDesks = [...deskSummaries].sort((a, b) => a.deskCode.localeCompare(b.deskCode));

    return sortedDesks.map((summary) => {
      const reservationsForDesk = (reservationsByDesk.get(summary.deskId) ?? []).filter(
        (reservation) => {
          const resStart = toMinutes(isoToHHMMInTR(reservation.bookingStart));
          const resEnd = toMinutes(isoToHHMMInTR(reservation.bookingEnd));
          return resEnd > windowStart && resStart < windowEnd;
        }
      );

      let cursor = windowStart;
      const segments: TimelineSegment[] = [];

      const pushAvailability = (startMinutes: number, endMinutes: number) => {
        if (endMinutes <= startMinutes) return;
        segments.push({
          kind: "available",
          label: "Available",
          range: `${minutesToHHMM(startMinutes)} – ${minutesToHHMM(endMinutes)}`,
          duration: endMinutes - startMinutes,
        });
      };

      reservationsForDesk.forEach((reservation) => {
        const resStart = Math.min(
          Math.max(toMinutes(isoToHHMMInTR(reservation.bookingStart)), windowStart),
          windowEnd
        );
        const resEnd = Math.min(
          Math.max(toMinutes(isoToHHMMInTR(reservation.bookingEnd)), windowStart),
          windowEnd
        );

        if (resEnd <= resStart) return;

        if (resStart > cursor) pushAvailability(cursor, resStart);

        const kind: TimelineSegment["kind"] =
          reservation.userId === currentUserId ? "mine" : "colleague";
        const occupant = reservation.user
          ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
          : kind === "mine"
          ? "You"
          : "Colleague";

        segments.push({
          kind,
          label: kind === "mine" ? "You" : occupant || "Colleague",
          range: `${isoToHHMMInTR(reservation.bookingStart)} – ${isoToHHMMInTR(
            reservation.bookingEnd
          )}`,
          duration: resEnd - resStart,
        });

        cursor = Math.max(cursor, resEnd);
      });

      if (cursor < windowEnd) pushAvailability(cursor, windowEnd);

      const status: SeatStatus = segments.some((segment) => segment.kind === "mine")
        ? "mine"
        : segments.some((segment) => segment.kind === "colleague")
        ? "booked"
        : "available";

      let statusLabel = "Fully available";
      if (status === "mine") {
        statusLabel = "Booked by you";
      } else if (status === "booked") {
        const uniqueNames = Array.from(
          new Set(
            segments
              .filter((segment) => segment.kind === "colleague")
              .map((segment) => segment.label.trim())
              .filter((label) => label && label.toLowerCase() !== "colleague")
          )
        );

        if (uniqueNames.length === 0) {
          statusLabel = "Booked by colleague";
        } else if (uniqueNames.length === 1) {
          statusLabel = `Booked by ${uniqueNames[0]}`;
        } else if (uniqueNames.length === 2) {
          statusLabel = `Booked by ${uniqueNames[0]} & ${uniqueNames[1]}`;
        } else {
          statusLabel = `Booked by ${uniqueNames[0]} +${uniqueNames.length - 1}`;
        }
      }

      return {
        deskId: summary.deskId,
        code: summary.deskCode,
        status,
        statusLabel,
        segments,
      } satisfies SeatRow;
    });
  }, [deskSummaries, reservationsByDesk, windowEnd, windowStart, currentUserId]);

  const seatStats = useMemo(() => {
    const total = deskSummaries.length;
    let mine = 0;
    let booked = 0;
    let available = 0;

    seatRows.forEach((row) => {
      if (row.status === "mine") mine += 1;
      else if (row.status === "booked") booked += 1;
      else available += 1;
    });

    return { total, mine, booked, available };
  }, [deskSummaries.length, seatRows]);

  const hasTimeline = windowEnd > windowStart && seatRows.length > 0;
  const windowLabel = `${minutesToHHMM(windowStart)} – ${minutesToHHMM(windowEnd)}`;

  const legend = useMemo(
    () => [
      { key: "available", label: "Available", className: "seat-segment--available" },
      { key: "mine", label: "Reserved by you", className: "seat-segment--mine" },
      { key: "colleague", label: "Reserved by colleague", className: "seat-segment--colleague" },
    ],
    []
  );

  return (
    <div className="seats-page">
      {error && (
        <div className="panel-warn" role="alert">
          {error}
        </div>
      )}

      <section className="panel-glass seats-controls">
        <header className="controls-header">
          <h1>Seats Overview</h1>
          <p className="muted">
            Browse desk availability across the floor. Adjust the date and time to see who is planning to be in the office.
          </p>
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
        </div>
      </section>

      {hasTimeline ? (
        <>
          <section className="seats-summary">
            <SummaryStat label="Total desks" value={seatStats.total} />
            <SummaryStat label="Fully available" value={seatStats.available} tone="available" />
            <SummaryStat label="Booked by you" value={seatStats.mine} tone="mine" />
            <SummaryStat label="Booked by colleagues" value={seatStats.booked} tone="colleague" />
          </section>

          <section className="panel-glass seats-board">
            <header className="seats-board__header">
              <div>
                <h2>Desk timeline</h2>
                <p className="muted">
                  Showing activity between {windowLabel} (local time).
                </p>
              </div>
              <ul className="seats-legend" aria-label="Seat status legend">
                {legend.map((item) => (
                  <li key={item.key} className="seats-legend__item">
                    <span className={`seats-legend__swatch ${item.className}`} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </header>

            <div className="seat-grid" role="list">
              {seatRows.map((row) => (
                <SeatTimeline key={row.deskId} row={row} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel-glass seats-empty">
          <h2>No time window selected</h2>
          <p className="muted">
            Please pick a valid start and end time within the working window to see desk availability.
          </p>
        </section>
      )}
    </div>
  );
}

type SeatStatus = "available" | "mine" | "booked";

type TimelineSegment = {
  kind: "available" | "mine" | "colleague";
  label: string;
  range: string;
  duration: number;
};

type SeatRow = {
  deskId: number;
  code: string;
  status: SeatStatus;
  statusLabel: string;
  segments: TimelineSegment[];
};

type SummaryStatProps = {
  label: string;
  value: number;
  tone?: "available" | "mine" | "colleague";
};

function SummaryStat({ label, value, tone }: SummaryStatProps) {
  return (
    <div className={`seat-summary-card${tone ? ` seat-summary-card--${tone}` : ""}`}>
      <span className="seat-summary-card__label">{label}</span>
      <span className="seat-summary-card__value">{value}</span>
    </div>
  );
}

type SeatTimelineProps = {
  row: SeatRow;
};

function SeatTimeline({ row }: SeatTimelineProps) {
  return (
    <article className={`seat-card seat-card--${row.status}`} role="listitem">
      <header className="seat-card__header">
        <div className="seat-card__title">
          <span className="seat-card__code">{row.code}</span>
          <span className="seat-card__status">{row.statusLabel}</span>
        </div>
      </header>
      <div className="seat-card__timeline" role="group" aria-label={`Timeline for desk ${row.code}`}>
        {row.segments.map((segment, index) => {
          const segmentClass = `seat-segment seat-segment--${segment.kind}`;
          return (
            <div
              key={`${row.deskId}-${segment.range}-${segment.kind}-${index}`}
              className={segmentClass}
              style={{ flexGrow: Math.max(segment.duration, 5), flexBasis: 0 }}
              title={`${segment.range} • ${segment.label}`}
            >
              <span className="seat-segment__range">{segment.range}</span>
              <span className="seat-segment__label">{segment.label}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

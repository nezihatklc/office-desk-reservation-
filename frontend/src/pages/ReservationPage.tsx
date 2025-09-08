import React, { useEffect, useMemo, useState } from "react";
import FloorPlan from "../components/FloorPlan";
import type { DeskStatus, LegendKey } from "../components/FloorPlan";
import { getAllReservations, makeReservation } from "../lib/reservations";
import { listDesks, type DeskSummary } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

// ---- Constants ----
const DAY_START = "09:00";
const DAY_END = "18:00";
const STEP_MIN = 30;

// ---- Time helpers ----
function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return !(toMin(aEnd) <= toMin(bStart) || toMin(bEnd) <= toMin(aStart));
}
function buildTimes(step = STEP_MIN, start = DAY_START, end = DAY_END) {
  const out: string[] = [];
  for (let t = toMin(start); t <= toMin(end); t += step) out.push(fromMin(t));
  return out;
}
const TIME_OPTS = buildTimes();

// Convert ISO to HH:MM in Europe/Istanbul
function isoToHHMMInTR(iso: string): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
}

// 🔹 Status mapping (backend → frontend)
function mapStatus(
  status: string | undefined
): "byMe" | "available" | "booked" | "unavailable" {
  switch (status) {
    case "MyReservation":
      return "byMe";
    case "BookedByOthers":
      return "booked";
    case "Available":
      return "available";
    case "Unavailable":
      return "unavailable";
    default:
      return "available";
  }
}

export default function ReservationPage() {
  const { user } = useAuth(); 
  const currentUserId = user?.userId ?? 0;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [date, setDate] = useState(todayStr);
  const [start, setStart] = useState(DAY_START);
  const [end, setEnd] = useState(DAY_END);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reservations, setReservations] = useState<any[]>([]);
  const [desks, setDesks] = useState<DeskSummary[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Map deskCode <-> deskId
  const codeToId = useMemo(() => {
    const map = new Map<string, number>();
    desks.forEach((d) => map.set(d.deskCode, d.deskId));
    return map;
  }, [desks]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [allRes, allDesks] = await Promise.all([
          getAllReservations(),
          listDesks(),
        ]);
        setReservations(allRes);
        setDesks([...allDesks].sort((a, b) => a.deskCode.localeCompare(b.deskCode)));
        setApiError(null);
      } catch (err: any) {
        console.error("Initial load failed:", err);
        setApiError("Cannot reach the backend. Check API base URL and that the backend is running.");
      }
    })();
  }, []);

  // Compute statuses
  const viewDesks: DeskStatus[] = useMemo(() => {
    return desks.map((d) => {
      let status: LegendKey = mapStatus(d.status);

      const sameDay = reservations.filter(
        (r) => (r.bookingDate ?? "").slice(0, 10) === date && r.deskId === d.deskId
      );

      const anyMine = sameDay
        .filter((r) => r.userId === currentUserId)
        .some((r) =>
          overlaps(start, end, isoToHHMMInTR(r.bookingStart), isoToHHMMInTR(r.bookingEnd))
        );

      const anyOther = sameDay
        .filter((r) => r.userId !== currentUserId)
        .some((r) =>
          overlaps(start, end, isoToHHMMInTR(r.bookingStart), isoToHHMMInTR(r.bookingEnd))
        );

      if (anyMine) status = "byMe";
      else if (anyOther) status = "booked";

      return {
        id: d.deskCode,
        label: d.deskCode,
        seats: 6,
        status,
      };
    });
  }, [desks, reservations, date, start, end, currentUserId]);

  async function handleReserve() {
    if (!user) {
      setApiError("Please log in to make reservations.");
      return;
    }

    if (!selectedId) {
      setApiError("Please select a desk first.");
      return;
    }

    const deskId = codeToId.get(selectedId);
    if (!deskId) {
      setApiError("Unknown desk. Please refresh the page.");
      return;
    }

    if (toMin(end) <= toMin(start)) {
      setApiError("End time must be after start time.");
      return;
    }

    const selectedDesk = viewDesks.find((d) => d.id === selectedId);
    if (selectedDesk?.status === "booked") {
      setApiError("This desk is already booked for the selected time.");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const startISO = new Date(`${date}T${start}:00+03:00`).toISOString();
      const endISO = new Date(`${date}T${end}:00+03:00`).toISOString();

      const reservationPayload = {
        userId: currentUserId,
        deskId: deskId,
        bookingDate: new Date(`${date}T00:00:00Z`).toISOString(),
        bookingStart: startISO,
        bookingEnd: endISO,
        status: "Confirmed",
      };

      const created = await makeReservation(reservationPayload);
      setReservations((prev) => [...prev, created]);

      setToast(`Reserved ${selectedId} for ${user.firstName} ${user.lastName} (${start}-${end})`);
      setTimeout(() => setToast(null), 3000);

      setSelectedId(null);
    } catch (err: any) {
      console.error("Reservation failed:", err);
      setApiError(err?.message || "Reservation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedDesk = useMemo(() => desks.find(d => d.deskCode === selectedId), [desks, selectedId]);

  const selectedDeskBookings = useMemo(() => {
    if (!selectedId) return [];
    const id = codeToId.get(selectedId);
    if (!id) return [];
    return reservations
      .filter((r) => r.deskId === id && (r.bookingDate ?? "").slice(0, 10) === date)
      .sort((a, b) => a.bookingStart.localeCompare(b.bookingStart));
  }, [selectedId, reservations, codeToId, date]);

  const userInfo = user ? `${user.firstName} ${user.lastName} (${user.email})` : "Not logged in";

  return (
    <div className="container">
      <div className="panel-glass" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Signed in as:</strong> {userInfo}</div>
          <div className="muted">Today: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {apiError && <div className="panel-warn" style={{ marginBottom: 12 }}>{apiError}</div>}

      <div className="panel-glass top-controls" style={{ marginBottom: 16 }}>
        <div className="col">
          <label className="label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" min={todayStr} />
        </div>
        <div className="col">
          <label className="label">Start</label>
          <select value={start} onChange={(e) => setStart(e.target.value)} className="input">
            {TIME_OPTS.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col">
          <label className="label">End</label>
          <select value={end} onChange={(e) => setEnd(e.target.value)} className="input">
            {TIME_OPTS.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col" style={{ alignSelf: "end" }}>
          <button className="btn btn-primary" onClick={handleReserve} disabled={isLoading || !user || !selectedId}>
            {isLoading ? "Reserving..." : "Reserve selected"}
          </button>
        </div>
      </div>

      <div className="page-grid">
        <div className="panel-glass floor-wrap">
          <FloorPlan desks={viewDesks} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <aside className="col" style={{ gap: 16 }}>
          <div className="panel-glass">
            <h2 style={{ marginBottom: 8 }}>Desk Details</h2>
            {selectedId ? (
              <>
                <div className="muted">Selected desk</div>
                <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>{selectedId}</div>

                {/* 🔹 Show facilities */}
                <div style={{ marginBottom: 12 }}>
                  <h4>Facilities</h4>
                  {selectedDesk?.facilities?.length ? (
                    <ul>
                      {selectedDesk.facilities.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No facilities listed.</p>
                  )}
                </div>

                {/* 🔹 Show bookings */}
                {selectedDeskBookings.length > 0 ? (
                  selectedDeskBookings.map((r) => (
                    <p key={r.bookingId} className="muted">
                      Reserved by <strong>{r.user?.firstName} {r.user?.lastName}</strong>{" "}
                      ({isoToHHMMInTR(r.bookingStart)}–{isoToHHMMInTR(r.bookingEnd)})
                    </p>
                  ))
                ) : (
                  <p className="muted">No reservations for {date}.</p>
                )}

                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleReserve} disabled={isLoading || !user}>
                  {isLoading ? "Reserving..." : "Reserve this desk"}
                </button>
              </>
            ) : (
              <p className="muted">Select a desk on the floor plan.</p>
            )}
          </div>

          <div className="panel-glass">
            <h2 style={{ marginBottom: 8 }}>Legend</h2>
            <div className="legend-grid">
              {[
                ["byMe", "#69a7ff", "My reservations"],
                ["booked", "#f87171", "Booked by others"],
                ["available", "#34d399", "Available"],
                ["unavailable", "#9ca3af", "Unavailable"],
              ].map(([k, color, label]) => (
                <div key={k} className="row" style={{ gap: 8 }}>
                  <span className="status-dot" style={{ background: color as string }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%",
          transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)",
          color: "#fff", padding: "8px 12px", borderRadius: 12, zIndex: 50,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

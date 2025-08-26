import React, { useEffect, useMemo, useState } from "react";
import FloorPlan from "../components/FloorPlan";
import type { DeskStatus, LegendKey } from "../components/FloorPlan";

<header className="app-header">
  <nav className="app-nav">
    <img src="/logo.svg" alt="DFDS" className="logo" />
    <a href="/floor" className="link">Floor</a>
    <a href="/reservations" className="link">My Reservations</a>
  </nav>
</header>

const TZ_LABEL = "Europe/Istanbul";
const DAY_START = "09:00";
const DAY_END = "18:00";
const STEP_MIN = 30;

type Reservation = {
  id: string;
  deskId: string;
  date: string;
  start: string;
  end: string;
  email: string;
  createdAt: string;
};

const RESV_KEY = "app:reservations";
const loadReservations = (): Reservation[] => {
  try { return JSON.parse(localStorage.getItem(RESV_KEY) || "[]"); } catch { return []; }
};
const saveReservations = (resv: Reservation[]) => localStorage.setItem(RESV_KEY, JSON.stringify(resv));

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m: number) => {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};
const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  !(toMin(aEnd) <= toMin(bStart) || toMin(bEnd) <= toMin(aStart));

function buildTimes(step = STEP_MIN, start = DAY_START, end = DAY_END) {
  const out: string[] = [];
  for (let t = toMin(start); t <= toMin(end); t += step) out.push(fromMin(t));
  return out;
}
const TIME_OPTS = buildTimes();

const LETTERS = Array.from({ length: 9 }, (_, i) => String.fromCharCode(65 + i)); // A..I
const NUMBERS = Array.from({ length: 7 }, (_, i) => i + 1); // 1..7
const ALL_DESKS: DeskStatus[] = LETTERS.flatMap((L) =>
  NUMBERS.map((n) => ({ id: `${L}${n}`, label: `${L}${n}`, seats: 6, status: "available" as LegendKey }))
);

const STATUS_COLORS: Record<LegendKey, string> = {
  byMe:        "var(--colors-secondary-main)",  
  booked:      "var(--colors-status-alert)",    
  available:   "var(--colors-status-success)", 
  unavailable: "var(--colors-divider-dark)",    
};

export default function ReservationPage() {
  const currentEmail =
    localStorage.getItem("auth:email") ||
    localStorage.getItem("email") ||
    "me@example.com";

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState(todayStr);
  const [start, setStart] = useState(DAY_START);
  const [end, setEnd] = useState(DAY_END);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>(loadReservations);
  const [toast, setToast] = useState<string | null>(null);
  const pushToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const desks: DeskStatus[] = useMemo(() => {
    const startMin = toMin(start);
    const endMin = toMin(end);
    const inBounds = startMin >= toMin(DAY_START) && endMin <= toMin(DAY_END) && startMin < endMin;

    return ALL_DESKS.map((d) => {
      let status: LegendKey = "available";
      if (!inBounds) {
        status = "unavailable";
      } else {
        const sameDay = reservations.filter((r) => r.date === date && r.deskId === d.id);
        const mine = sameDay.filter((r) => r.email === currentEmail);
        const anyMine = mine.some((r) => overlaps(r.start, r.end, start, end));
        const anyOther = sameDay.filter((r) => r.email !== currentEmail).some((r) => overlaps(r.start, r.end, start, end));
        if (anyMine) status = "byMe";
        else if (anyOther) status = "booked";
      }
      return { ...d, status };
    });
  }, [date, start, end, reservations, currentEmail]);

  const errEndBeforeStart = toMin(end) <= toMin(start);
  const errOutOfBounds   = toMin(start) < toMin(DAY_START) || toMin(end) > toMin(DAY_END);

  const selectedStatus = useMemo(() => {
    if (!selectedId) return null;
    return desks.find((d) => d.id === selectedId)?.status ?? null;
  }, [desks, selectedId]);

  const reserveSelected = () => {
    if (!selectedId) return;
    if (errEndBeforeStart) return pushToast("End time must be after start time");
    if (errOutOfBounds)   return pushToast("Bookings are allowed between 09:00–18:00");
    if (selectedStatus !== "available") return pushToast("This desk is not available for the selected time range");

    if (!window.confirm(`Confirm reservation?\n\nDesk ${selectedId} — ${date}, ${start}–${end}`)) return;

    const resv: Reservation = {
      id: crypto.randomUUID(),
      deskId: selectedId,
      date, start, end,
      email: currentEmail,
      createdAt: new Date().toISOString(),
    };
    const next = [...reservations, resv];
    setReservations(next);
    saveReservations(next);
    pushToast("Reservation confirmed.");
    setTimeout(() => pushToast(`Confirmation email sent to ${currentEmail}`), 500);
  };

  const selectedDesk = useMemo(
    () => (selectedId ? ALL_DESKS.find((d) => d.id === selectedId) : null),
    [selectedId]
  );

  return (
    
    <div className="container">
      {/* Top controls */}
      <div className="panel-glass top-controls" style={{ marginBottom: 16 }}>
        <div className="col">
          <label className="label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
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

        <div className="muted" style={{ marginLeft: "auto" }}>Timezone: {TZ_LABEL} • 24h format</div>
      </div>

      {errEndBeforeStart && <div className="panel-warn" style={{ marginBottom: 12 }}>End time must be after start time.</div>}
      {errOutOfBounds   && <div className="panel-warn" style={{ marginBottom: 12 }}>Bookings are allowed between 09:00–18:00.</div>}

      <div className="page-grid">
        {/* Floor */}
        <div className="panel-glass floor-wrap">
          <FloorPlan desks={desks} selectedId={selectedId} onSelect={setSelectedId} />
        </div>


        {/* Sidebar */}
        <aside className="col" style={{ gap: 16 }}>
          <div className="panel-glass">
            <h2 style={{ marginBottom: 8 }}>Desk Details</h2>

            {selectedDesk ? (
              <>
                <div className="muted">Selected desk</div>
                <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                  {selectedDesk.label}
                </div>

                <div className="row" style={{ gap: 12, marginBottom: 10 }}>
                  <span className="badge">Capacity: {selectedDesk.seats}</span>
                  <span className="badge" style={{ borderColor: "#555" }}>
                    <span
                      className="status-dot"
                      style={{ background: selectedStatus ? STATUS_COLORS[selectedStatus] : "#9ca3af" }}
                    />
                    {selectedStatus}
                  </span>
                </div>

                {selectedStatus === "byMe" && (
                  <p className="muted">Reserved by <strong>{currentEmail}</strong></p>
                )}
                {selectedStatus === "booked" && (
                  <p className="muted">Reserved by <strong>Another user</strong></p>
                )}

                {selectedStatus === "available" && !errEndBeforeStart && !errOutOfBounds && (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={reserveSelected}
                    style={{ marginTop: 12 }}
                  >
                    Reserve this desk
                  </button>
                )}
              </>
            ) : (
              <p className="muted">Select a desk on the floor plan.</p>
            )}

          </div>

          <div className="panel-glass">
            <h2 style={{ marginBottom: 8 }}>Legend</h2>
            <div className="legend-grid">
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <div key={key} className="row" style={{ gap: 8 }}>
                  <span className="status-dot" style={{ background: color }} />
                  <span>{key}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.8)", color: "#fff", padding: "8px 12px",
          borderRadius: 12, boxShadow: "var(--shadow)", zIndex: 50
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

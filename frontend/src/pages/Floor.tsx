import React, { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { createReservation } from "../lib/reservations";

// ==== Types ====
type Desk = {
  id: string;
  label: string;
  seats: number;            // small seat dots
  // Grid position (1-indexed)
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  zone?: string;            // A block, Phone Booth, etc.
};

type Booking = {
  deskId: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  byMe?: boolean;
  byRequest?: boolean;
};

// ==== Mock Data (sample floor plan) ====
// A few islands on a 24x14 grid
const DESKS: Desk[] = [
  { id: "A1", label: "A1", seats: 6, colStart: 3, colEnd: 7, rowStart: 4, rowEnd: 6, zone: "A" },
  { id: "A2", label: "A2", seats: 6, colStart: 8, colEnd: 12, rowStart: 4, rowEnd: 6, zone: "A" },
  { id: "A3", label: "A3", seats: 6, colStart: 13, colEnd: 17, rowStart: 4, rowEnd: 6, zone: "A" },
  { id: "B1", label: "B1", seats: 8, colStart: 5, colEnd: 10, rowStart: 7, rowEnd: 9, zone: "B" },
  { id: "C1", label: "C1", seats: 4, colStart: 19, colEnd: 22, rowStart: 5, rowEnd: 7, zone: "C" },
  { id: "PB", label: "Phone Booth", seats: 1, colStart: 4, colEnd: 5, rowStart: 10, rowEnd: 12, zone: "Service" },
];

const BOOKINGS: Booking[] = [
  { deskId: "A1", start: "09:00", end: "12:00" },
  { deskId: "A2", start: "13:00", end: "15:00", byMe: true },
  { deskId: "A3", start: "16:00", end: "18:00" },
  { deskId: "B1", start: "12:30", end: "18:00", byRequest: true },
];

// ==== Helpers ====
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const A1 = toMinutes(aStart), A2 = toMinutes(aEnd);
  const B1 = toMinutes(bStart), B2 = toMinutes(bEnd);
  return Math.max(A1, B1) < Math.min(A2, B2);
}

// Color legend
const LEGEND = {
  byMe: "#69a7ff",        // Booked by me
  booked: "#f87171",      // Booked
  available: "#34d399",   // Available
  unavailable: "#9ca3af", // Unavailable
  byRequest: "#fbbf24",   // By request
};

// Render small seat dots
function Seats({ count, status }: { count: number; status: keyof typeof LEGEND }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 10px)", gap: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          title={status}
          style={{
            width: 10, height: 10, borderRadius: 999,
            background: LEGEND[status],
            display: "inline-block"
          }}
        />
      ))}
    </div>
  );
}

// ---- Istanbul-aware date helpers (MVP uses "today") ----
function todayISOInIstanbul(): string {
  // Returns "YYYY-MM-DD" for Europe/Istanbul
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(new Date()); // en-CA -> YYYY-MM-DD
}
function buildDateInIstanbul(timeHHMM: string): Date {
  // Build a Date for "today @ HH:MM" in Europe/Istanbul
  const dateStr = todayISOInIstanbul(); // YYYY-MM-DD
  return new Date(`${dateStr}T${timeHHMM}:00`);
}

// ==== Page ====
export default function Reservation() {
  const [start, setStart] = useState("12:27");
  const [end, setEnd] = useState("18:00");
  const [selectedDesk, setSelectedDesk] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Compute availability given the selected time window
  const deskStatus = useMemo(() => {
    const map = new Map<string, keyof typeof LEGEND>();
    DESKS.forEach(d => map.set(d.id, "available"));

    BOOKINGS.forEach(b => {
      if (overlap(start, end, b.start, b.end)) {
        map.set(b.deskId, b.byMe ? "byMe" : (b.byRequest ? "byRequest" : "booked"));
      }
    });

    return map;
  }, [start, end]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DESKS.filter(d =>
      d.label.toLowerCase().includes(q) || (d.zone ?? "").toLowerCase().includes(q)
    );
  }, [search]);

  const selected = DESKS.find(d => d.id === selectedDesk) ?? null;

  // Confirm & create reservation (uses adapter; later this becomes an API call)
  async function handleReserve() {
    if (!selected) {
      alert("Please select a desk from the plan first.");
      return;
    }

    // ✅ ALWAYS unique numeric id based on index in DESKS (no collisions across zones)
    const numericDeskId = DESKS.findIndex(d => d.id === selected.id) + 1;

    const startDt = buildDateInIstanbul(start);
    const endDt = buildDateInIstanbul(end);

    await createReservation(
      numericDeskId,
      startDt,
      endDt,
      user?.email || "",
      selected.label // ✅ also persist human-readable label
    );

    // Navigate to Profile/My Reservations so the user can see it
    navigate("/me");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, height: "100vh", padding: 16 }}>
      {/* Left: top controls + plan + timeline */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 12, minWidth: 0 }}>
        {/* Top controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong style={{ marginRight: 8 }}>Start</strong>
          <input type="time" value={start} onChange={e => setStart(e.target.value)} />
          <strong style={{ marginLeft: 16, marginRight: 8 }}>End</strong>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              placeholder="Find"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
        </div>

        {/* Floor grid */}
        <div
          style={{
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            background: "#f8fafc"
          }}
        >
          {/* Grid lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(24, 1fr)",
              gridTemplateRows: "repeat(14, 1fr)",
              backgroundSize: "24px 24px",
            }}
          >
            {/* Desk cards */}
            {filtered.map(desk => {
              const status = deskStatus.get(desk.id) ?? "available";
              const isSelected = selectedDesk === desk.id;
              return (
                <button
                  key={desk.id}
                  onClick={() => setSelectedDesk(desk.id)}
                  style={{
                    gridColumn: `${desk.colStart} / ${desk.colEnd}`,
                    gridRow: `${desk.rowStart} / ${desk.rowEnd}`,
                    margin: 6,
                    borderRadius: 12,
                    border: isSelected ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    background: "#fff",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer"
                  }}
                  title={desk.label}
                >
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{desk.label}</div>
                  <Seats count={desk.seats} status={status} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline (simple, single row) */}
        <Timeline start="07:00" end="18:00" bookings={BOOKINGS} selectedDesk={selectedDesk} />
      </div>

      {/* Right panel */}
      <aside
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "auto"
        }}
      >
        <h3 style={{ margin: 0 }}>On this floor</h3>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {Object.entries(LEGEND).map(([k, color]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
              {k}
            </span>
          ))}
        </div>

        {/* Selected desk card */}
        {selected ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 10,
              background: "#fff",
              display: "grid",
              gap: 6
            }}
          >
            <strong>{selected.label}</strong>
            <span>Zone: {selected.zone ?? "-"}</span>
            <span>Seats: {selected.seats}</span>
            <button
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "white",
                fontWeight: 600,
                cursor: "pointer"
              }}
              onClick={handleReserve}
              disabled={!selected}
            >
              Reserve {start} – {end}
            </button>
          </div>
        ) : (
          <em>Pick a desk from the plan on the left.</em>
        )}
      </aside>
    </div>
  );
}

// ==== Timeline component (simple single bar) ====
function Timeline({
  start, end, bookings, selectedDesk
}: { start: string; end: string; bookings: Booking[]; selectedDesk: string | null; }) {
  const s = toMinutes(start), e = toMinutes(end);
  const segments: { leftPct: number; widthPct: number; type: "booked" | "free"; byMe?: boolean; byRequest?: boolean }[] = [];

  // Draw for the selected desk; otherwise draw general bar
  const relevant = selectedDesk ? bookings.filter(b => b.deskId === selectedDesk) : bookings;

  // Booked blocks
  relevant.forEach(b => {
    const b1 = Math.max(s, toMinutes(b.start));
    const b2 = Math.min(e, toMinutes(b.end));
    if (b2 > b1) {
      const leftPct = ((b1 - s) / (e - s)) * 100;
      const widthPct = ((b2 - b1) / (e - s)) * 100;
      segments.push({ leftPct, widthPct, type: "booked", byMe: b.byMe, byRequest: b.byRequest });
    }
  });

  // Simple: we treat the rest as a single "free" background (MVP)
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Capacity</div>
      <div style={{ position: "relative", height: 20, background: "#eef2ff", borderRadius: 8, overflow: "hidden" }}>
        {/* booked blocks */}
        {segments.map((seg, i) => {
          const color = seg.byMe
            ? LEGEND.byMe
            : seg.byRequest
            ? LEGEND.byRequest
            : LEGEND.booked;
          return (
            <div key={i} style={{
              position: "absolute",
              left: `${seg.leftPct}%`,
              width: `${seg.widthPct}%`,
              top: 0, bottom: 0,
              background: color,
            }} />
          );
        })}
        {/* subtle inset border */}
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
        <span>07:00</span><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:00</span><span>18:00</span>
      </div>
    </div>
  );
}

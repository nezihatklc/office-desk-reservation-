import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  listUpcomingBookings,
  listPastBookings,
  type BookingResponse,
  type AuditLogResponse,
} from "../lib/api";
import API from "../lib/api"; // 🔹 import axios instance for DELETE
import { isoToHHMMInTR } from "../lib/floorUtils";

type TabKey = "upcoming" | "past";

export default function ProfilePage() {
  const { user } = useAuth();
  const email = user?.email || "";
  const userId = user?.userId;

  const [tab, setTab] = useState<TabKey>("upcoming");
  const [upcoming, setUpcoming] = useState<BookingResponse[]>([]);
  const [past, setPast] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Load reservations from backend
  useEffect(() => {
    (async () => {
      if (!userId) return;

      try {
        if (tab === "upcoming") {
          const data = await listUpcomingBookings();
          setUpcoming(data.filter((r) => r.userId === userId));
        } else {
          const data = await listPastBookings();
          setPast(data.filter((r) => r.userId === userId));
        }
      } catch (err) {
        console.error("Failed to load reservations:", err);
      }
    })();
  }, [userId, tab]);

  // 🔹 Cancel booking
  async function cancelBooking(id: number) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      setLoading(true);
      await API.delete(`/Bookings/${id}`);
      setUpcoming((prev) => prev.filter((r) => r.bookingId !== id)); // update UI
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const list = tab === "upcoming" ? upcoming : past;
  const upcomingCount = upcoming.length;
  const pastCount = past.length;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));

  const formatTimeRange = (startISO: string, endISO: string) =>
    `${isoToHHMMInTR(startISO)} – ${isoToHHMMInTR(endISO)}`;

  return (
    <div className="page-shell profile-page">
      <section className="panel-glass profile-card">
        <header className="profile-header">
          <div className="profile-heading">
            <h1>My Reservations</h1>
            <p className="muted">Signed in as {email || "Guest"}</p>
          </div>
          <div className="profile-summary" aria-label="Reservation counts">
            <ProfileStat label="Upcoming" value={upcomingCount} accent="mine" />
            <ProfileStat label="History" value={pastCount} accent="available" />
          </div>
        </header>

        <div className="profile-tabs" role="tablist">
          <button
            className={`profile-tab${tab === "upcoming" ? " active" : ""}`}
            type="button"
            onClick={() => setTab("upcoming")}
            role="tab"
            aria-selected={tab === "upcoming"}
          >
            Upcoming
          </button>
          <button
            className={`profile-tab${tab === "past" ? " active" : ""}`}
            type="button"
            onClick={() => setTab("past")}
            role="tab"
            aria-selected={tab === "past"}
          >
            Past
          </button>
        </div>

        {list.length === 0 ? (
          <div className="panel-dark empty-state" role="status" aria-live="polite">
            {tab === "upcoming"
              ? "You have no upcoming reservations."
              : "No reservation history yet."}
          </div>
        ) : (
          <div className="profile-reservations">
            {tab === "upcoming"
              ? upcoming.map((r) => (
                  <article key={r.bookingId} className="reservation-card" aria-label={`Desk ${r.deskId} reservation`}>
                    <header className="reservation-card__header">
                      <div>
                        <span className="reservation-card__desk">{r.deskCode ?? `Desk #${r.deskId}`}</span>
                      </div>
                      <span className="reservation-card__status">{r.status ?? "Confirmed"}</span>
                    </header>
                    <dl className="reservation-card__details">
                      <div>
                        <dt>Date</dt>
                        <dd>{formatDate(r.bookingDate)}</dd>
                      </div>
                      <div>
                        <dt>Time</dt>
                        <dd>{formatTimeRange(r.bookingStart, r.bookingEnd)}</dd>
                      </div>
                    </dl>
                    <footer className="reservation-card__footer">
                      <button
                        className="btn btn-danger"
                        onClick={() => cancelBooking(r.bookingId)}
                        disabled={loading}
                      >
                        {loading ? "Cancelling…" : "Cancel reservation"}
                      </button>
                    </footer>
                  </article>
                ))
              : past.map((log) => (
                  <article key={log.logId} className="reservation-card" aria-label={`Audit log ${log.logId}`}>
                    <header className="reservation-card__header">
                      <div>
                        <span className="reservation-card__desk">{log.action}</span>
                      </div>
                      <span className="reservation-card__status reservation-card__status--neutral">History</span>
                    </header>
                    <dl className="reservation-card__details">
                      <div>
                        <dt>Date</dt>
                        <dd>{formatDate(log.logTime)}</dd>
                      </div>
                      <div>
                        <dt>Time</dt>
                        <dd>
                          {isoToHHMMInTR(log.logTime)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
          </div>
        )}
      </section>
    </div>
  );
}

type ProfileStatProps = {
  label: string;
  value: number;
  accent?: "mine" | "available";
};

function ProfileStat({ label, value, accent }: ProfileStatProps) {
  return (
    <div className={`profile-stat${accent ? ` profile-stat--${accent}` : ""}`}>
      <span className="profile-stat__value">{value}</span>
      <span className="profile-stat__label">{label}</span>
    </div>
  );
}

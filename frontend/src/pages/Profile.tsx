import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  listUpcomingBookings,
  listPastBookings,
  type BookingResponse,
  type AuditLogResponse,
} from "../lib/api";
import API from "../lib/api"; // 🔹 import axios instance for DELETE

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

  return (
    <div className="container">
      <div className="panel-glass card">
        <h1 className="auth-title" style={{ textAlign: "left" }}>My Reservations</h1>
        <p className="muted" style={{ marginBottom: 12 }}>
          Signed in as {email || "Guest"}
        </p>

        {/* Tabs */}
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            className={`btn ${tab === "upcoming" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`btn ${tab === "past" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("past")}
          >
            Past
          </button>
        </div>

        {/* Empty state */}
        {list.length === 0 ? (
          <div className="panel-dark" role="status" aria-live="polite">
            You have no {tab} reservations.
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {tab === "upcoming" &&
              upcoming.map((r) => (
                <div
                  key={r.bookingId}
                  className="panel-glass"
                  style={{ display: "grid", gap: 8 }}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>Desk #{r.deskId}</strong>
                    <span className="badge">{r.status}</span>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <div>
                      <span className="label">Date</span>
                      <p>{new Date(r.bookingDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="label" style={{ marginLeft: 16 }}>Time</span>
                      <p>
                        {new Date(r.bookingStart).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} –{" "}
                        {new Date(r.bookingEnd).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* 🔹 Cancel button */}
                  <button
                    className="btn btn-danger"
                    onClick={() => cancelBooking(r.bookingId)}
                    disabled={loading}
                  >
                    {loading ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              ))}

            {tab === "past" &&
              past.map((log) => (
                <div
                  key={log.logId}
                  className="panel-glass"
                  style={{ display: "grid", gap: 8 }}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>Action:</strong>
                    <span className="badge">{log.action}</span>
                  </div>
                  <div>
                    <span className="label">Date</span>
                    <p>{new Date(log.logTime).toLocaleString()}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

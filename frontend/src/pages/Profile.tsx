import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext"; // varsayım: user.email sağlıyor
import { byUser, remove, isPast, fmtRangeEnGB } from "../lib/reservations";
import type { Reservation } from "../lib/reservations";

type TabKey = "upcoming" | "past";

export default function ProfilePage() {
  const { user } = useAuth();
  const email = user?.email || "";

  const [tab, setTab] = useState<TabKey>("upcoming");
  const [items, setItems] = useState<Reservation[]>([]);

  useEffect(() => { setItems(byUser(email)); }, [email]);

  const { upcoming, past } = useMemo(() => {
    const u = items.filter(r => !isPast(r));
    const p = items.filter(r =>  isPast(r));
    // sort: nearest first for upcoming, newest-first for past
    u.sort((a,b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
    p.sort((a,b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
    return { upcoming: u, past: p };
  }, [items]);

  const list = tab === "upcoming" ? upcoming : past;

  function onCancel(id: string) {
    const ok = window.confirm("Cancel this reservation?");
    if (!ok) return;
    const nextAll = remove(id);
    setItems(nextAll.filter(r => r.ownerEmail === email));
    // basit toast simulasyonu:
    setTimeout(() => alert("Reservation cancelled."), 10);
  }

  return (
    <div className="container">
      <div className="panel-glass card">
        <h1 className="auth-title" style={{textAlign:"left"}}>My Reservations</h1>
        <p className="muted" style={{marginBottom:12}}>Signed in as {email}</p>

        {/* tabs */}
        <div className="row" style={{marginBottom:12}}>
          <button
            className={`btn ${tab==="upcoming" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("upcoming")}
          >Upcoming</button>
          <button
            className={`btn ${tab==="past" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("past")}
          >Past</button>
        </div>

        {/* empty state */}
        {list.length === 0 ? (
          <div className="panel-dark" role="status" aria-live="polite">
            You have no reservations.
          </div>
        ) : (
          <div className="col" style={{gap:12}}>
            {list.map(r => {
              const { dateLabel, timeLabel } = fmtRangeEnGB(r.startISO, r.endISO);
              const canCancel = tab === "upcoming";
              return (
                <div key={r.id} className="panel-glass" style={{display:"grid", gap:8}}>
                  <div className="row" style={{justifyContent:"space-between"}}>
                    <strong>Desk #{r.deskId}</strong>
                    <span className="badge">Reservation</span>
                  </div>
                  <div className="row" style={{flexWrap:"wrap"}}>
                    <div><span className="label">Date</span><p>{dateLabel}</p></div>
                    <div><span className="label" style={{marginLeft:16}}>Time</span><p>{timeLabel}</p></div>
                  </div>
                  {canCancel && (
                    <div className="row" style={{justifyContent:"end"}}>
                      <button className="btn btn-primary" onClick={() => onCancel(r.id)}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

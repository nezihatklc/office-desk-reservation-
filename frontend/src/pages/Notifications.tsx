import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listUpcomingBookings } from "../lib/api";
import { isoToHHMMInTR } from "../lib/floorUtils";
import {
  loadCancellationRecords,
  loadCheckoutRecords,
  USER_UNREAD_FLAG_KEY,
} from "../lib/notificationStore";

const READ_STORAGE_KEY = "notifications:read-ids";

function loadStoredReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === "string"));
    }
    return new Set();
  } catch (err) {
    console.warn("Failed to load read notifications", err);
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn("Failed to persist read notifications", err);
  }
}

function updateUnreadFlag(hasUnread: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_UNREAD_FLAG_KEY, hasUnread ? "1" : "0");
    window.dispatchEvent(new Event("notifications:sync"));
  } catch (err) {
    console.warn("Failed to persist notification badge", err);
  }
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  href?: string;
  tone?: "info" | "warning" | "alert";
};

function formatDateLabel(date: Date): string {
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
  if (diffDays > 1 && diffDays <= 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  if (diffDays < -1 && diffDays >= -7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.userId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadStoredReadIds());
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => setRevision((prev) => prev + 1);
    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === READ_STORAGE_KEY ||
        event.key === "notifications:cancellations" ||
        event.key === "notifications:checkouts"
      ) {
        handleUpdate();
      }
    };

    window.addEventListener("notifications:cancellations", handleUpdate);
    window.addEventListener("notifications:checkouts", handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("notifications:cancellations", handleUpdate);
      window.removeEventListener("notifications:checkouts", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        updateUnreadFlag(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const bookings = await listUpcomingBookings();
        if (cancelled) return;
        const mine = bookings.filter((booking) => booking.userId === userId);
        const storedIds = loadStoredReadIds();
        setReadIds(storedIds);
        const bookingNotifications = mine.map<NotificationItem>((booking) => {
          const start = new Date(booking.bookingStart);
          const created = booking.created ? new Date(booking.created) : null;
          let timestamp = start.toISOString();
          if (created && !Number.isNaN(created.getTime())) {
            timestamp = created.toISOString();
          }
          const dateLabel = new Date(booking.bookingDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          return {
            id: `booking-${booking.bookingId}`,
            title: `Desk ${booking.deskCode ?? booking.deskId} reserved`,
            message: `${dateLabel} · ${isoToHHMMInTR(booking.bookingStart)} – ${isoToHHMMInTR(booking.bookingEnd)}`,
            timestamp,
            read: storedIds.has(`booking-${booking.bookingId}`),
            href: "/me",
            tone: "info",
          };
        });
        const cancellationRecords = loadCancellationRecords().filter((record) => record.userId === userId);
        const cancellationNotifications = cancellationRecords.map<NotificationItem>((record) => {
          const id = `cancel-${record.bookingId}-${record.recordedAt}`;
          const dateLabel = new Date(record.bookingDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return {
            id,
            title: `Reservation cancelled for ${record.deskCode ?? `Desk #${record.bookingId}`}`,
            message: `${dateLabel} · ${isoToHHMMInTR(record.bookingStart)} – ${isoToHHMMInTR(record.bookingEnd)} · Cancelled by an administrator`,
            timestamp: record.recordedAt,
            read: storedIds.has(id),
            tone: "alert",
            href: "/me",
          };
        });
        const checkoutRecords = loadCheckoutRecords().filter(
          (record) => record.performedByUserId === userId || record.userId === userId
        );
        const checkoutNotifications = checkoutRecords.map<NotificationItem>((record) => {
          const id = `checkout-${record.bookingId}-${record.recordedAt}`;
          const deskLabel = record.deskCode ?? `Desk #${record.bookingId}`;
          const performerIsUser = record.performedByUserId === userId;
          const performer = performerIsUser
            ? "You"
            : record.performedByName || `User #${record.performedByUserId}`;
          const occupantIsUser = record.userId === userId;
          const occupant = occupantIsUser
            ? "your booking"
            : record.occupantName
              ? `${record.occupantName}'s booking`
              : `booking #${record.bookingId}`;
          const message = performerIsUser
            ? `You checked out of ${deskLabel}.`
            : `${performer} checked out ${occupant} on ${deskLabel}.`;

          return {
            id,
            title: `Checked out • ${deskLabel}`,
            message,
            timestamp: record.recordedAt,
            read: storedIds.has(id),
            tone: performerIsUser ? "info" : "warning",
            href: "/me",
          };
        });

        const combined = [...checkoutNotifications, ...cancellationNotifications, ...bookingNotifications].sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp)
        );

        setNotifications(combined);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load notifications", err);
        setError("We couldn't load notifications. Please refresh.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, revision]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    updateUnreadFlag(unreadCount > 0);
  }, [unreadCount]);

  function markAllRead() {
    if (notifications.length === 0) return;
    if (readIds.size === notifications.length) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((item) => next.add(item.id));
      persistReadIds(next);
      return next;
    });
  }

  function toggleRead(id: string) {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, read: !item.read }
          : item
      )
    );
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

  const grouped = useMemo(() => {
    const sections = new Map<string, NotificationItem[]>();
    notifications.forEach((item) => {
      const label = formatDateLabel(new Date(item.timestamp));
      if (!sections.has(label)) {
        sections.set(label, []);
      }
      sections.get(label)!.push(item);
    });

    return Array.from(sections.entries()).map(([label, items]) => ({
      label,
      items: items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }));
  }, [notifications]);

  return (
    <div className="page-shell notifications-page">
      <section className="panel-glass notifications-card">
        <header className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p className="muted">Stay on top of upcoming reservations and account activity.</p>
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
            You're all caught up. New notifications will appear here.
          </div>
        ) : (
          <div className="notifications-groups">
            {grouped.map((section) => (
              <section key={section.label} className="notifications-group" aria-label={section.label}>
                <h2>{section.label}</h2>
                <ul>
                  {section.items.map((item) => {
                    const classes = ["notification"];
                    if (item.read) classes.push("read");
                    if (item.tone) classes.push(`notification--${item.tone}`);

                    return (
                      <li key={item.id} className={classes.join(" ")}>
                      <div className="notification-body">
                        <div className="notification-title-row">
                          <span className="notification-title">{item.title}</span>
                          <time dateTime={item.timestamp}>
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
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
                        {item.href && (
                          <Link className="btn btn-primary" to={item.href}>
                            View details
                          </Link>
                        )}
                      </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

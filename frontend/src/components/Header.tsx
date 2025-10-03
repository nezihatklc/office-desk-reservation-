// src/components/Header.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../assets/dfds-logo.jpg?url";

export default function Header() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
    : "";

  const notificationsPath = isAdmin ? "/admin/notifications" : "/notifications";
  const unreadFlagKey = isAdmin ? "notifications:admin:lastUnread" : "notifications:lastUnread";

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(unreadFlagKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const updateUnread = () => {
      if (typeof window === "undefined") return;
      try {
        setHasUnreadNotifications(window.localStorage.getItem(unreadFlagKey) === "1");
      } catch {
        setHasUnreadNotifications(false);
      }
    };

    updateUnread();
    const storageHandler = (event: StorageEvent) => {
      if (!event.key || event.key === unreadFlagKey) {
        updateUnread();
      }
    };

    window.addEventListener("notifications:sync", updateUnread as EventListener);
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener("notifications:sync", updateUnread as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, [unreadFlagKey]);

  const authPages = new Set([
    "/login",
    "/register",
    "/confirm-email-pending",
    "/confirm-email",
    "/forgot-password",
    "/reset-password",
    "/sign-out",
  ]);
  const isAuthPage = authPages.has(pathname);
  if (isAuthPage) return null;

  return (
    <header className="app-header">
      <nav className="app-nav">
        {/* === Left: Logo === */}
        <div className="app-nav-left">
          <button
            type="button"
            className="logo-button"
            onClick={() => nav("/floor")}
            aria-label="Go to floor overview"
          >
            <img
              src={logoUrl}
              alt="DFDS logo"
              className="logo"
            />
          </button>
        </div>

        {/* === Center: Navigation === */}
        <div className="app-nav-center">
          <Link className={`link${pathname === "/floor" ? " active" : ""}`} to="/floor">
            Floor
          </Link>
          <Link className={`link${pathname === "/seats" ? " active" : ""}`} to="/seats">
            Seats Overview
          </Link>
          <Link className={`link${pathname === "/me" ? " active" : ""}`} to="/me">
            My Reservations
          </Link>
          {isAdmin && (
            <Link className={`link${pathname === "/admin" ? " active" : ""}`} to="/admin">
              Admin
            </Link>
          )}
        </div>

        {/* === Right: User info + sign out === */}
        {user && (
          <div className="app-nav-right">
            <Link
              className={`notification-button${pathname === notificationsPath ? " active" : ""}`}
              to={notificationsPath}
              aria-label={
                hasUnreadNotifications
                  ? "View notifications (new alerts)"
                  : "View notifications"
              }
            >
              <span aria-hidden="true" className="bell-icon">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M12 3a5 5 0 0 0-5 5v1.38c0 .74-.2 1.46-.58 2.09l-.86 1.44A1 1 0 0 0 6.4 14h11.2a1 1 0 0 0 .84-1.57l-.86-1.44c-.38-.63-.58-1.35-.58-2.09V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 21Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              {hasUnreadNotifications && <span className="notification-indicator" aria-hidden="true" />}
            </Link>
            <span className="text-sm text-white/80">
              Welcome <strong>{userDisplayName}</strong>
            </span>
            <button
              className="signout-btn"
              onClick={() => {
                nav("/sign-out");
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

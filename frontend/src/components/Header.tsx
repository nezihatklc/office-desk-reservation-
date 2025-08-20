// src/components/Header.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../assets/dfds-logo.jpg?url";

export default function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const isAuthPage = pathname === "/login" || pathname === "/register";
   if (isAuthPage) {
    return null;
  }

  return (
    <header className="app-header">
      <nav className="app-nav">
        <img src={logoUrl} alt="Company logo" className="logo" />
        {!isAuthPage && (
          <>
            <Link className="link" to="/floor">Floor</Link>
            <Link className="link" to="/me">My Reservations</Link>
            <div className="push-right" />
            {user && (
              <>
                <span>Signed in as <strong>{user.email}</strong></span>
                <button
                  className="btn btn-ghost"
                  onClick={() => { signOut(); nav("/login", { replace: true }); }}
                >
                  Sign out
                </button>
              </>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

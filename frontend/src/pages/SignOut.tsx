import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/dfds-logo.png";

export default function SignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const didSignOutRef = useRef(false);

  useEffect(() => {
    if (!didSignOutRef.current) {
      didSignOutRef.current = true;
      signOut();
      window.alert("You are being signed out and will be redirected to the login page in a few seconds.");
    }

    const timer = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [navigate, signOut]);

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <br />
        <h2 className="auth-title">Signing you out…</h2>
        <p className="muted auth-hint">We’re getting things ready. You’ll be back on the login page shortly.</p>
      </div>
    </div>
  );
}

// src/pages/Login.tsx
// Uses global design system classes (no inline styles, no page-scoped CSS).
// Handles sign-in with AuthContext and redirects on success.

import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/dfds-logo.png";

export default function Login() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const nav = useNavigate();
  const loc = useLocation();

  // If already signed in, go to the app
  useEffect(() => {
    if (user) nav("/floor", { replace: true });
  }, [user, nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await signIn(email.trim(), pw);
    if (res) setErr(res);
    else {
      // Redirect to where the user came from or default to /floor
      const from = (loc.state as any)?.from?.pathname || "/floor";
      nav(from, { replace: true });
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <br/>
      
        <h2 className="auth-title">Login</h2>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              required
              autoComplete="current-password"
            />
          </div>

          {err && <div className="form-error">{err}</div>}

          <button type="submit" className="btn btn-primary btn-block btn-lg">
            Login
          </button>
        </form>

        <p className="muted auth-hint">
          Don’t have an account?{" "}
          <Link className="link" to="/register" state={{ from: loc }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

// src/pages/Login.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/dfds-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nav = useNavigate();
  const { signIn } = useAuth();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    try {
      const { error, user } = await signIn(email.trim(), pw);

      if (error) {
        // 🔹 Normalize error for unconfirmed email
        const normalized = error.toLowerCase();
        if (
          normalized.includes("confirm your email") ||
          normalized.includes("email not confirmed")
        ) {
          nav("/confirm-email-pending", { state: { email: email.trim() } });
        } else {
          setErr(error);
        }
      } else {
        // ✅ Login success → go to protected route
        if (user?.role?.toLowerCase() === "admin") {
          nav("/admin", { replace: true });
        } else {
          nav("/floor", { replace: true });
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErr(error.message || "Login failed. Please try again.");
      } else {
        setErr("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <br />

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
              onChange={(e) => {
                setEmail(e.target.value);
                setErr(null); // clear error when typing
              }}
              required
              autoComplete="email"
              disabled={isLoading}
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
              onChange={(e) => {
                setPw(e.target.value);
                setErr(null); // clear error when typing
              }}
              minLength={8}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {/* 🔹 Forgot password link */}
          <p className="muted auth-hint">
            <Link className="link" to="/forgot-password">
              Forgot password?
            </Link>
          </p>

          {/* 🔹 Error feedback */}
          {err && (
            <div className="form-error" aria-live="polite">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="muted auth-hint">
          Don't have an account?{" "}
          <Link className="link" to="/register">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

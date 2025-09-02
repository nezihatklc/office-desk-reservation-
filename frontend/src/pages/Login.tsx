// src/pages/Login.tsx
import {useState} from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../lib/api"; //import from API
import logo from "../assets/dfds-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const nav = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); // clear old error

    try {
      const user = await loginUser({ email: email.trim(), password: pw });
      console.log("Login success:", user);

      //redirect to floor page after successful login
      nav("/floor", { replace: true });
    } catch (error: any) {
      console.error("Login failed:", error);
      setErr(error.message || "Login failed. Please try again.");
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
          <Link className="link" to="/register">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

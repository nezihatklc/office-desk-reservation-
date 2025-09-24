// src/pages/Register.tsx

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Simple email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password rules
function validatePassword(pw: string) {
  const minLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  return { minLen, hasUpper, hasNumber, ok: minLen && hasUpper && hasNumber };
}

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [accepted, setAccepted]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nav = useNavigate();
  const { register } = useAuth();

  const emailValid   = emailRegex.test(email);
  const pw           = useMemo(() => validatePassword(password), [password]);
  const confirmValid = confirm.length > 0 && confirm === password;
  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid  = lastName.trim().length  >= 2;

  const formValid =
    firstNameValid &&
    lastNameValid &&
    emailValid &&
    pw.ok &&
    confirmValid &&
    accepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;

    setError(null);
    setIsLoading(true);

    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const trimmedEmail = email.trim();

      const { error: registerError, confirmUrl, confirmCode } = await register(
        trimmedFirst,
        trimmedLast,
        trimmedEmail,
        password
      );

      if (registerError) {
        setError(registerError);
      } else if (confirmUrl) {
        try {
          const url = new URL(confirmUrl);
          const tokenParam = url.searchParams.get("token");
          const emailParam = url.searchParams.get("email") ?? trimmedEmail;

          if (tokenParam && emailParam) {
            const params = new URLSearchParams({
              token: tokenParam,
              email: emailParam,
            });

            if (confirmCode) {
              params.set("prefillCode", confirmCode);
            }

            nav(`/confirm-email?${params.toString()}`, { replace: true });
          } else {
            nav("/confirm-email-pending", { state: { email: trimmedEmail, confirmCode } });
          }
        } catch (parseErr) {
          console.warn("Failed to parse confirmation URL", parseErr);
          nav("/confirm-email-pending", { state: { email: trimmedEmail, confirmCode } });
        }
      } else {
        nav("/confirm-email-pending", { state: { email: trimmedEmail, confirmCode } });
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      const backendMsg =
        err?.response?.data?.error || err?.response?.data?.message;
      setError(backendMsg || err?.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1 className="auth-title">Create Account</h1>

        <p className="auth-hint">
          Already have an account?{" "}
          <Link to="/login" className="link">Log in</Link>
        </p>

        <form onSubmit={handleSubmit} noValidate className="form" aria-label="register form">
          {/* First & Last Name */}
          <div className="form-two">
            <div className="form-field">
              <label htmlFor="firstName" className="label">First Name</label>
              <input
                id="firstName"
                className="input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                required
                minLength={2}
              />
              {!firstNameValid && firstName.length > 0 && (
                <p className="error-text">First name must be at least 2 characters.</p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="lastName" className="label">Last Name</label>
              <input
                id="lastName"
                className="input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                required
                minLength={2}
              />
              {!lastNameValid && lastName.length > 0 && (
                <p className="error-text">Last name must be at least 2 characters.</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              required
              autoComplete="email"
            />
            {email.length > 0 && !emailValid && (
              <p className="error-text">Please enter a valid email.</p>
            )}
          </div>

          {/* Password */}
          <div className="form-field">
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters, uppercase & number"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div className="hints">
              <div className={pw.minLen ? "hint-ok" : "hint-bad"}>• At least 8 characters</div>
              <div className={pw.hasUpper ? "hint-ok" : "hint-bad"}>• Contains an uppercase letter</div>
              <div className={pw.hasNumber ? "hint-ok" : "hint-bad"}>• Contains a number</div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-field">
            <label htmlFor="confirm" className="label">Confirm Password</label>
            <input
              id="confirm"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
            />
            {confirm.length > 0 && !confirmValid && (
              <p className="error-text">Passwords do not match.</p>
            )}
          </div>

          {/* Terms */}
          <label className="form-field" style={{gap: 8}}>
            <span className="row" style={{alignItems:"flex-start"}}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
                aria-label="Accept the Terms and Conditions"
                style={{marginTop: 4}}
              />
              <span style={{ color: "#1f2937" }}>
                I accept the Terms and Conditions{" "}
                <Link to="/terms" className="link">(Read)</Link>
              </span>
            </span>
          </label>

          {/* Error */}
          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={!formValid || isLoading}
          >
            {isLoading ? "Creating..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

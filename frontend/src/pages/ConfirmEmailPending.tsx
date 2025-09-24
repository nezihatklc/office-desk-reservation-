import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type LocationState = {
  email?: string;
  confirmCode?: string;
};

export default function ConfirmEmailPending() {
  const { resendConfirmationEmail } = useAuth();
  const location = useLocation();

  const initialState = (location.state as LocationState | null) ?? {};
  const initialEmail = initialState.email ?? "";
  const initialCode = initialState.confirmCode ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleResend(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email.trim()) {
      setError("Please enter the email address you registered with.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await resendConfirmationEmail(email.trim());

      if (result.error) {
        setError(result.error);
      } else {
        let success = "A fresh confirmation link has been sent. Check your inbox.";
        if (result.confirmCode) {
          success += ` (Dev code: ${result.confirmCode})`;
        }
        setMessage(success);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card" role="status" aria-live="polite">
        <h1 className="auth-title">Confirm Your Email</h1>
        <p className="auth-hint">
          Enter the email you used during registration and we’ll resend a confirmation link with a 6-digit code.
        </p>

        {initialCode && (
          <div className="panel-dark" style={{ marginBottom: 14 }}>
            <strong>Dev code:</strong> {initialCode}
          </div>
        )}

        <form className="form" onSubmit={handleResend} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage(null);
                setError(null);
              }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? "Sending..." : "Resend confirmation email"}
          </button>
        </form>

        <p className="muted auth-hint">
          Ready to log in? <Link className="link" to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

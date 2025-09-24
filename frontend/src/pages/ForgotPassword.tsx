import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/dfds-logo.png";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isDev = import.meta.env.DEV;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | undefined>();
  const [devResetUrl, setDevResetUrl] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { forgotPassword } = useAuth();

  const emailValid = emailRegex.test(email.trim());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!emailValid || isSubmitting) return;

    setError(null);
    setMessage(null);
    setDevToken(undefined);
    setDevResetUrl(undefined);
    setIsSubmitting(true);

    try {
      const { error: err, message: serverMessage, devToken, devResetUrl } = await forgotPassword(
        email.trim()
      );

      if (err) {
        setError(err);
      } else {
        setMessage(serverMessage ?? "If the email exists in our system, a reset link has been sent.");
        setDevToken(devToken);
        setDevResetUrl(devResetUrl);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <br />

        <h2 className="auth-title">Forgot Password</h2>
        <p className="auth-hint">Enter your email address and we'll send you a reset link.</p>

        {message && (
          <div className="form-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            type="submit"
            disabled={!emailValid || isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="muted auth-hint">
          Remembered your password?{" "}
          <Link className="link" to="/login">
            Back to login
          </Link>
        </p>

        <p className="muted auth-hint">
          Need an account?{" "}
          <Link className="link" to="/register">
            Register here
          </Link>
        </p>

        {isDev && (devResetUrl || devToken) && (
          <details>
            <summary>Developer info</summary>
            <ul>
              {devResetUrl && (
                <li>
                  Reset URL: <a href={devResetUrl}>{devResetUrl}</a>
                </li>
              )}
              {devToken && <li>Token: {devToken}</li>}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

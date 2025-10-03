import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const [lastRequestedEmail, setLastRequestedEmail] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "token" | null>(null);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const emailValid = emailRegex.test(email.trim());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!emailValid || isSubmitting) return;

    setError(null);
    setMessage(null);
    setDevToken(undefined);
    setDevResetUrl(undefined);
    setLastRequestedEmail(null);
    setCopiedField(null);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const { error: err, message: serverMessage, devToken, devResetUrl } = await forgotPassword(
        trimmedEmail
      );

      if (err) {
        setError(err);
      } else {
        setMessage(serverMessage ?? "If the email exists in our system, a reset link has been sent.");
        setDevToken(devToken);
        setDevResetUrl(devResetUrl);
        setLastRequestedEmail(trimmedEmail);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!copiedField) return undefined;
    const timerId = window.setTimeout(() => setCopiedField(null), 1800);
    return () => window.clearTimeout(timerId);
  }, [copiedField]);

  function handleOpenResetForm() {
    const targetEmail = (lastRequestedEmail ?? email).trim();
    const search = targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : "";
    navigate(`/reset-password${search}`, { replace: false });
  }

  async function handleCopy(value: string, field: "url" | "token") {
    if (!value) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedField(field);
        return;
      }

      throw new Error("Clipboard API not available");
    } catch (err) {
      console.error("clipboard write failed", err);
      if (typeof window !== "undefined") {
        window.prompt("Copy to clipboard:", value);
      }
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

        {message && (
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg forgot-next-btn"
            onClick={handleOpenResetForm}
          >
            Open reset form
          </button>
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
          <div className="dev-info" role="note" aria-live="polite">
            <div className="dev-info__header">
              <span className="dev-info__title">Developer info</span>
            </div>
            {devResetUrl && (
              <div className="dev-info__item">
                <span className="dev-info__label">Reset URL</span>
                <code className="dev-info__value" tabIndex={0}>{devResetUrl}</code>
                <button
                  type="button"
                  className="dev-info__copy"
                  onClick={() => handleCopy(devResetUrl, "url")}
                >
                  {copiedField === "url" ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            {devToken && (
              <div className="dev-info__item">
                <span className="dev-info__label">Token</span>
                <code className="dev-info__value" tabIndex={0}>{devToken}</code>
                <button
                  type="button"
                  className="dev-info__copy"
                  onClick={() => handleCopy(devToken, "token")}
                >
                  {copiedField === "token" ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

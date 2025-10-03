import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/dfds-logo.png";

const SUCCESS_REDIRECT_DELAY = 3500;

function validatePassword(pw: string) {
  const trimmed = pw.trim();
  const minLen = trimmed.length >= 8;
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasNumber = /\d/.test(trimmed);
  return {
    minLen,
    hasUpper,
    hasNumber,
    ok: minLen && hasUpper && hasNumber,
  };
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const initialToken = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const rules = useMemo(() => validatePassword(password), [password]);
  const trimmedPassword = password.trim();
  const trimmedConfirm = confirm.trim();
  const confirmMatches = trimmedConfirm.length > 0 && trimmedConfirm === trimmedPassword;
  const tokenValid = token.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tokenValid || !rules.ok || !confirmMatches || isSubmitting) return;

    setError(null);
    setMessage(null);
    setShowSuccessModal(false);
    setRedirectCountdown(null);
    setIsSubmitting(true);

    try {
      const { error: err, message: serverMessage } = await resetPassword(
        token.trim(),
        trimmedPassword
      );

      if (err) {
        setError(err);
      } else {
        setMessage(serverMessage ?? "Password reset successfully. You can now log in with your new password.");
        setPassword("");
        setConfirm("");
        setShowSuccessModal(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!showSuccessModal) return undefined;

    setRedirectCountdown(Math.ceil(SUCCESS_REDIRECT_DELAY / 1000));

    const timeoutId = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, SUCCESS_REDIRECT_DELAY);

    const intervalId = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null) return null;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [showSuccessModal, navigate]);

  function handleGoToLogin() {
    navigate("/login", { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <img src={logo} alt="Company Logo" className="login-logo" />
        <br />

        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-hint">
          Choose a new password for your account{email ? ` (${email})` : ""}.
        </p>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="reset-token">
              Reset token
            </label>
            <input
              id="reset-token"
              className="input"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from your email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters, uppercase & number"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <div className="hints">
              <div className={rules.minLen ? "hint-ok" : "hint-bad"}>• At least 8 characters</div>
              <div className={rules.hasUpper ? "hint-ok" : "hint-bad"}>• Contains an uppercase letter</div>
              <div className={rules.hasNumber ? "hint-ok" : "hint-bad"}>• Contains a number</div>
            </div>
          </div>

          <div className="form-field">
            <label className="label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              required
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {confirm.length > 0 && !confirmMatches && (
              <p className="error-text">Passwords do not match.</p>
            )}
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            type="submit"
            disabled={!tokenValid || !rules.ok || !confirmMatches || isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="muted auth-hint">
          Back to{" "}
          <Link className="link" to="/login">
            login
          </Link>
        </p>
      </div>

      {showSuccessModal && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-success-title"
        >
          <div className="modal-card">
            <h2 id="reset-success-title">Password reset ✅</h2>
            <p>{message ?? "Your password has been updated."}</p>
            <p className="muted">
              Redirecting to login{redirectCountdown ? ` in ${redirectCountdown} second${redirectCountdown === 1 ? "" : "s"}` : ""}…
            </p>
            <button type="button" className="btn btn-primary" onClick={handleGoToLogin}>
              Go to login now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

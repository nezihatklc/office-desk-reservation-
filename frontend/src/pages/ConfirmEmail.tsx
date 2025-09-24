import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Status = "idle" | "loading" | "success" | "error";

type Message = {
  title: string;
  body: string;
};

export default function ConfirmEmail() {
  const { confirmEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = (searchParams.get("email") ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();
  const prefillCode = (searchParams.get("prefillCode") ?? "").trim();

  const initialMessage: Message = useMemo(() => {
    if (!email || !token) {
      return {
        title: "Missing information",
        body: "We couldn’t find both the email and token. Please use the link from your inbox or request a new one.",
      };
    }

    return {
      title: "Check your inbox",
      body: `Enter the six-digit code we emailed to ${email}, then press confirm.`,
    };
  }, [email, token]);

  const [status, setStatus] = useState<Status>(!email || !token ? "error" : "idle");
  const [message, setMessage] = useState<Message>(initialMessage);
  const [code, setCode] = useState(prefillCode);

  async function handleConfirm() {
    if (!email || !token) {
      setStatus("error");
      setMessage({
        title: "Missing information",
        body: "We couldn’t find both the email and token. Please use the link from your inbox or request a new one.",
      });
      return;
    }

    if (!code || code.trim().length !== 6) {
      setStatus("error");
      setMessage({
        title: "Enter your code",
        body: "Please type the six-digit code we sent to your inbox.",
      });
      return;
    }

    try {
      setStatus("loading");
      const err = await confirmEmail(email, token, code.trim());

      if (err) {
        setStatus("error");
        setMessage({
          title: "Unable to confirm",
          body: err,
        });
      } else {
        setStatus("success");
        setMessage({
          title: "Email confirmed ✅",
          body: "You can now head back to the login page.",
        });
      }
    } catch (err) {
      console.error("confirmEmail failed:", err);
      setStatus("error");
      setMessage({
        title: "Unexpected error",
        body: "Something went wrong while confirming your email. Please try again.",
      });
    }
  }

  const disableConfirm = status === "loading" || !email || !token || code.trim().length !== 6;

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1 className="auth-title">Confirm Email</h1>
        <p className="auth-hint" style={{ marginBottom: 12 }}>
          Entered as <strong>{email || "unknown"}</strong>
        </p>

        <div className="panel-dark" style={{ marginBottom: 20 }}>
          <h2 className="label" style={{ marginBottom: 6 }}>{message.title}</h2>
          <p className="muted" style={{ margin: 0 }}>{message.body}</p>
        </div>

        <div className="form-field" style={{ marginBottom: 16 }}>
          <label className="label" htmlFor="otp">Six-digit code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="\\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            className="input"
            placeholder="000000"
            value={code}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9]/g, "");
              setCode(value);
              if (status === "error") setStatus("idle");
            }}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={handleConfirm}
          disabled={disableConfirm}
        >
          {status === "loading" ? "Confirming..." : "Confirm my email"}
        </button>

        <p className="muted auth-hint" style={{ marginTop: 20 }}>
          Need another link? <Link className="link" to="/confirm-email-pending" state={{ email }}>Resend confirmation email</Link>
        </p>
      </div>

      {status === "success" && (
        <div className="modal-backdrop" role="alertdialog" aria-labelledby="confirm-success-title" aria-modal="true">
          <div className="modal-card">
            <h2 id="confirm-success-title">Email confirmed ✅</h2>
            <p>You can now log in with your credentials.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/login", { replace: true })}
            >
              Go to login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

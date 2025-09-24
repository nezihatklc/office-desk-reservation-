import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="auth-page">
      <article
        className="card auth-card"
        role="document"
        aria-labelledby="terms-title"
      >
        <h1 id="terms-title" className="auth-title">
          Terms & Conditions
        </h1>
        <p
          className="auth-hint"
          style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}
        >
          Last updated: {new Date(2025, 7, 20).toLocaleDateString()}
        </p>

        <div className="form" style={{ marginTop: 12 }}>
          {/* 1. Acceptance of Terms */}
          <section className="form-field">
            <h2
              className="label"
              style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}
            >
              1. Acceptance of Terms
            </h2>
            <p
              style={{
                color: "#374151",
                fontSize: "15px",
                lineHeight: "1.6",
                marginTop: "2px",
              }}
            >
              By creating an account and using this service, you agree to be
              bound by these Terms and our Privacy Policy.
            </p>
          </section>

          {/* 2. Account */}
          <section className="form-field" id="account">
            <h2 className="label" style={{ fontWeight: 600, fontSize: "16px" }}>
              2. Account
            </h2>
            <p style={{ color: "#374151", fontSize: "15px", lineHeight: "1.6" }}>
              You are responsible for maintaining the confidentiality of your
              credentials and for all activities under your account.
            </p>
          </section>

          {/* 3. Acceptable Use */}
          <section className="form-field" id="use">
            <h2 className="label" style={{ fontWeight: 600, fontSize: "16px" }}>
              3. Acceptable Use
            </h2>
            <p style={{ color: "#374151", fontSize: "15px", lineHeight: "1.6" }}>
              Do not misuse the service, interfere with its operation, or
              attempt unauthorized access.
            </p>
          </section>

          {/* 4. Data & Privacy */}
          <section className="form-field" id="data">
            <h2 className="label" style={{ fontWeight: 600, fontSize: "16px" }}>
              4. Data & Privacy
            </h2>
            <p style={{ color: "#374151", fontSize: "15px", lineHeight: "1.6" }}>
              We process your data as described in our Privacy Policy. Do not
              upload confidential data you do not own or control.
            </p>
          </section>

          {/* 5. Changes */}
          <section className="form-field" id="changes">
            <h2 className="label" style={{ fontWeight: 600, fontSize: "16px" }}>
              5. Changes
            </h2>
            <p style={{ color: "#374151", fontSize: "15px", lineHeight: "1.6" }}>
              We may update these Terms. We will notify you of material changes
              and update the “Last updated” date above.
            </p>
          </section>

          {/* 6. Contact */}
          <section className="form-field" id="contact">
            <h2 className="label" style={{ fontWeight: 600, fontSize: "16px" }}>
              6. Contact
            </h2>
            <p style={{ color: "#374151", fontSize: "15px", lineHeight: "1.6" }}>
              Questions? Contact us at{" "}
              <a
                className="link"
                href="mailto:support@example.com"
                style={{ color: "#2563eb", fontWeight: 500 }}
              >
                support@example.com
              </a>
              .
            </p>
          </section>

          {/* Buttons */}
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <Link to="/register" className="btn btn-ghost">
              Back to Sign Up
            </Link>
            <Link to="/login" className="btn btn-primary">
              I Understand
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

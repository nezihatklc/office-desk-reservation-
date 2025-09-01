import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="auth-page">
      <article className="card auth-card" role="document" aria-labelledby="terms-title">
        <h1 id="terms-title" className="auth-title">Terms & Conditions</h1>
        <p className="auth-hint">
          Last updated: {new Date(2025, 7, 20).toLocaleDateString()}
        </p>

        <div className="form" style={{marginTop: 8}}>
          <section className="form-field">
            <h2 className="label">1. Acceptance of Terms</h2>
            <p>By creating an account and using this service, you agree to be bound by these Terms and our Privacy Policy.</p>
          </section>

          <section className="form-field" id="account">
            <h2 className="label">2. Account</h2>
            <p>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
          </section>

          <section className="form-field" id="use">
            <h2 className="label">3. Acceptable Use</h2>
            <p>Do not misuse the service, interfere with its operation, or attempt unauthorized access.</p>
          </section>

          <section className="form-field" id="data">
            <h2 className="label">4. Data & Privacy</h2>
            <p>We process your data as described in our Privacy Policy. Do not upload confidential data you do not own or control.</p>
          </section>

          <section className="form-field" id="changes">
            <h2 className="label">5. Changes</h2>
            <p>We may update these Terms. We will notify you of material changes and update the “Last updated” date above.</p>
          </section>

          <section className="form-field" id="contact">
            <h2 className="label">6. Contact</h2>
            <p>Questions? Contact us at <a className="link" href="mailto:support@example.com">support@example.com</a>.</p>
          </section>

          <div className="row" style={{justifyContent:"space-between", marginTop: 8}}>
            <Link to="/register" className="btn btn-ghost">Back to Sign Up</Link>
            <Link to="/login" className="btn btn-primary">I Understand</Link>
          </div>
        </div>
      </article>
    </div>
  );
}

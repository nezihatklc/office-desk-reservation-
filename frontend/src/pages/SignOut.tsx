import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
export default function SignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const didSignOutRef = useRef(false);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (!didSignOutRef.current) {
      didSignOutRef.current = true;
      signOut();
      setShowNotice(true);
    }

    const timer = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [navigate, signOut]);

  return (
    <div className="signout-page">
      {showNotice && (
        <div className="signout-notice__backdrop" role="alertdialog" aria-modal="true">
          <div className="signout-notice__dialog">
            <h3>See you soon!</h3>
            <p>You have been signed out and will be redirected to the login page in a few seconds.</p>
            <div className="signout-notice__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigate(-1);
                }}
              >
                Stay here
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/login", { replace: true })}
              >
                Go to login now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

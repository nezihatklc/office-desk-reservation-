// Guards private routes. If not signed in, redirect to /login.
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  // Remove dev bypass for proper authentication
  // const devBypass = true; // Remove this line
  // if (devBypass) return <Outlet />; // Remove this line

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated, otherwise render protected content
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
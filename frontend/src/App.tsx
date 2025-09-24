import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";

// Public pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/terms";
import Profile from "./pages/Profile";
import ConfirmEmailPending from "./pages/ConfirmEmailPending";
import ConfirmEmail from "./pages/ConfirmEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SignOut from "./pages/SignOut";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import AdminNotifications from "./pages/AdminNotifications";

// Reservation page → Floor (Floor includes FloorPlan inside)
import Floor from "./pages/Floor";
import SeatsOverview from "./pages/SeatsOverview";

// Protected route wrapper
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-email-pending" element={<ConfirmEmailPending />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sign-out" element={<SignOut />} />
          <Route path="/terms" element={<Terms />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Reservation points to Floor (which itself renders FloorPlan) */}
            <Route path="/floor" element={<Floor />} />
            <Route path="/seats" element={<SeatsOverview />} />
            <Route path="/me" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Floor from "./pages/Floor";
import Profile from "./pages/Profile";
import ProtectedRoute from "./auth/ProtectedRoute";
import Terms from "./pages/Terms";

export default function App() {
  return (
    <main>
      <Header />
      <div className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<Terms />} />

          {/* Protected area */}
          <Route element={<ProtectedRoute />}>
            <Route path="/floor" element={<Floor />} />
            <Route path="/me" element={<Profile />} />
          </Route>

          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </div>
    </main>
  );
}

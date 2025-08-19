import { Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Floor from "./pages/Floor";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <main style={{ padding: 24 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/login">Login</Link> |{" "}
        <Link to="/register">Register</Link> |{" "}
        <Link to="/floor">Floor</Link> |{" "}
        <Link to="/me">My Reservations</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/floor" element={<Floor />} />
        <Route path="/me" element={<Profile />} />
        <Route path="*" element={<div>Not Found</div>} />
      </Routes>
    </main>
  );
}

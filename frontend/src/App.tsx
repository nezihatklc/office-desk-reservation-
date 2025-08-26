import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Terms from "./pages/Terms";
import ReservationPage from "./pages/ReservationPage";
import ProtectedRoute from "./auth/ProtectedRoute";
// import FloorOld from "./pages/Floor"; // istersen tut

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

          <Route element={<ProtectedRoute />}>
            <Route path="/floor" element={<ReservationPage />} />
            {/* <Route path="/floor-old" element={<FloorOld />} /> */}
            <Route path="/me" element={<Profile />} />
          </Route>

          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </div>
    </main>
  );
}

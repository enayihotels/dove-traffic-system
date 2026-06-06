import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./stores/auth";
import Layout         from "./layouts/Layout";
import LoginPage      from "./pages/LoginPage";
import Dashboard      from "./pages/Dashboard";
import Sessions       from "./pages/Sessions";
import Queue          from "./pages/Queue";
import Students       from "./pages/Students";
import AIAssistant    from "./pages/AIAssistant";
import Checkin        from "./pages/Checkin";
import MyStatus       from "./pages/MyStatus";
import QRVerify       from "./pages/QRVerify";
import ChangePassword from "./pages/ChangePassword";
import AdminPanel     from "./pages/AdminPanel";

// Saves the page the user was trying to visit,
// then redirects to login. After login they go back there.
const Guard = ({ children }: { children: React.ReactNode }) => {
  const { authed } = useAuth();
  const location   = useLocation();
  if (!authed) {
    // Save intended destination in location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Navigate to={user?.role === "parent" ? "/checkin" : "/dashboard"} replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="sessions"   element={<Sessions />} />
        <Route path="queue/:id"  element={<Queue />} />
        <Route path="students"   element={<Students />} />
        <Route path="ai"         element={<AIAssistant />} />
        <Route path="checkin"    element={<Checkin />} />
        <Route path="status"     element={<MyStatus />} />
        <Route path="password"   element={<ChangePassword />} />
        <Route path="admin"      element={<AdminPanel />} />
        <Route path="verify"     element={<QRVerify />} />
        <Route path="verify/:id" element={<QRVerify />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

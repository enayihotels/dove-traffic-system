import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./stores/auth";
import Layout       from "./layouts/Layout";
import LoginPage    from "./pages/LoginPage";
import Dashboard    from "./pages/Dashboard";
import Sessions     from "./pages/Sessions";
import Queue        from "./pages/Queue";
import Students     from "./pages/Students";
import AIAssistant  from "./pages/AIAssistant";
import Checkin      from "./pages/Checkin";
import MyStatus     from "./pages/MyStatus";

const Guard = ({ children }: { children: React.ReactNode }) => {
  const { authed } = useAuth();
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Navigate to={user?.role === "parent" ? "/checkin" : "/dashboard"} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sessions"  element={<Sessions />} />
        <Route path="queue/:id" element={<Queue />} />
        <Route path="students"  element={<Students />} />
        <Route path="ai"        element={<AIAssistant />} />
        <Route path="checkin"   element={<Checkin />} />
        <Route path="status"    element={<MyStatus />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Receipt } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BillForm from "./pages/BillForm";
import Bills from "./pages/Bills";
import Profile from "./pages/Profile";

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200">
      <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-primary text-primary-content">
        <Receipt className="h-7 w-7" />
      </span>
      <span className="loading loading-dots loading-md text-primary" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <SplashScreen />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bill" element={<BillForm />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/profile" element={<Profile />} />
              {/* Old routes kept as redirects */}
              <Route path="/register" element={<Navigate to="/profile" replace />} />
              <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

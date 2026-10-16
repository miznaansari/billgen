import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Building2,
  LogOut,
  Receipt,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { track } from "../firebase";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bill", label: "New Bill", icon: FilePlus2 },
  { to: "/bills", label: "My Bills", icon: Files },
  { to: "/profile", label: "Company", icon: Building2 },
];

function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-content shadow-sm">
        <Receipt className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Bill<span className="text-primary">Gen</span>
        </span>
      )}
    </div>
  );
}

function UserBadge({ user, onLogout, compact = false }) {
  const initial = (user?.displayName || user?.email || "U").charAt(0).toUpperCase();
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "rounded-xl border border-base-300 bg-base-200/60 p-3"}`}>
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          className="h-9 w-9 shrink-0 rounded-full border border-base-300 object-cover"
        />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {initial}
        </span>
      )}
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.displayName || "My Account"}</p>
          <p className="truncate text-xs text-base-content/50">{user?.email}</p>
        </div>
      )}
      <button
        onClick={onLogout}
        className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-error"
        title="Log out"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    track("page_view", { page: location.pathname });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const desktopLink = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-base-content/65 hover:bg-base-200 hover:text-base-content"
    }`;

  const mobileLink = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
      isActive ? "text-primary" : "text-base-content/50"
    }`;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-base-300 bg-base-100 px-4 py-5 lg:flex">
        <div className="px-1.5">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={desktopLink}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <UserBadge user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-base-300 bg-base-100/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <UserBadge user={user} onLogout={handleLogout} compact />
      </header>

      {/* Page content */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:py-8 lg:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-base-300 bg-base-100/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={mobileLink}>
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

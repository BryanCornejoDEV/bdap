import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function NavBar(){
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40">
      <div className="backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0f1115]/60 bg-white/80 dark:bg-[#0f1115]/80 border-b border">
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
          <Link to="/" className="font-semibold">Dashboard</Link>

          <div className="flex items-center gap-3">
            <input
              placeholder="Search here"
              aria-label="Buscar"
              className="md2-card px-4 py-2 rounded-lg w-64 text-sm outline-none"
            />
            <ThemeToggle />
            <span className="text-sm opacity-75 hidden sm:block">
              {user?.email} ({user?.role})
            </span>
            <button onClick={logout} className="px-4 py-2 rounded-lg border">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

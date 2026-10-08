import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useState } from "react";
import api from "../services/apiClient";
import { IconLogo, IconLogout, IconOrg } from "./icons";

export default function NavBar() {
  const { user, logout, switchOrg } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoadingOrgs(true);
      try {
        const { data } = await api.get("/organizations");
        if (active) setOrgs(data);
      } catch {
        if (active) setOrgs([]);
      } finally {
        if (active) setLoadingOrgs(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user]);

  return (
    <header
      className="sticky top-0 z-40 h-16 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="h-full px-4 md:px-8 flex items-center gap-3">
        {/* Marca visible solo en móvil (sidebar oculto) */}
        <Link to="/" className="md:hidden flex items-center gap-2 font-semibold">
          <span
            className="w-7 h-7 rounded-lg grid place-items-center text-white"
            style={{ background: "var(--accent)" }}
          >
            <IconLogo size={16} />
          </span>
          BDAP
        </Link>

        <div className="ml-auto flex items-center gap-2.5">
          {user?.orgId != null && orgs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-muted">
              <IconOrg size={16} />
              <select
                className="select select-sm w-44"
                value={user.orgId ?? ""}
                onChange={(e) => switchOrg(Number(e.target.value))}
                disabled={loadingOrgs}
                aria-label="Organización"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.role === "owner" ? " · owner" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-2 pl-2.5 border-l" style={{ borderColor: "var(--border)" }}>
            <div className="leading-tight text-right">
              <p className="text-[13px] font-medium">{user?.email}</p>
              <p className="text-[11px] text-muted capitalize">{user?.role}</p>
            </div>
          </div>

          <button onClick={logout} className="btn btn-ghost btn-sm" title="Cerrar sesión">
            <IconLogout size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

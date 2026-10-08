import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  IconLogo,
  IconDashboard,
  IconReports,
  IconIntegrations,
  IconUsers,
  IconUser,
  IconSettings,
} from "./icons";

const NAV = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/reports", label: "Reportes", icon: IconReports },
  { to: "/integrations", label: "Integraciones", icon: IconIntegrations },
  { to: "/users", label: "Usuarios", icon: IconUsers, adminOnly: true },
  { to: "/profile", label: "Perfil", icon: IconUser },
  { to: "/settings", label: "Ajustes", icon: IconSettings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const itemClass = ({ isActive }) => `nav-item${isActive ? " active" : ""}`;

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      aria-label="Barra lateral"
    >
      <div className="flex items-center gap-2.5 px-5 h-16">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center text-white"
          style={{ background: "var(--accent)" }}
        >
          <IconLogo size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">BDAP</p>
          <p className="text-[11px] text-muted">Business Analytics</p>
        </div>
      </div>

      <nav className="grid gap-1 px-3 pt-2" aria-label="Navegación principal">
        {NAV.filter((i) => !i.adminOnly || user?.role === "admin").map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={itemClass}>
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-5 py-4 text-[11px] text-muted border-t" style={{ borderColor: "var(--border)" }}>
        BDAP · Plataforma de análisis de datos
      </div>
    </aside>
  );
}

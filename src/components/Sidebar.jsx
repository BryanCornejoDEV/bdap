import { useEffect } from "react";
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
  IconX,
} from "./icons";

const NAV = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/reports", label: "Reportes", icon: IconReports },
  { to: "/integrations", label: "Integraciones", icon: IconIntegrations },
  { to: "/users", label: "Usuarios", icon: IconUsers, adminOnly: true },
  { to: "/profile", label: "Perfil", icon: IconUser },
  { to: "/settings", label: "Ajustes", icon: IconSettings },
];

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { user } = useAuth();
  const itemClass = ({ isActive }) => `nav-item${isActive ? " active" : ""}`;

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = (
    <nav className="grid gap-1 px-3 pt-2" aria-label="Navegación principal">
      {NAV.filter((i) => !i.adminOnly || user?.role === "admin").map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={itemClass}
          onClick={() => {
            if (mobileOpen && onClose) onClose();
          }}
        >
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Sidebar para desktop */}
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

        {navLinks}

        <div className="mt-auto px-5 py-4 text-[11px] text-muted border-t" style={{ borderColor: "var(--border)" }}>
          BDAP · Plataforma de análisis
        </div>
      </aside>

      {/* Drawer móvil con Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-64 max-w-[80%] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg grid place-items-center text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <IconLogo size={18} />
                </div>
                <div className="leading-tight">
                  <p className="font-semibold tracking-tight">BDAP</p>
                  <p className="text-[11px] text-muted">Menú principal</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-icon"
                title="Cerrar menú"
                aria-label="Cerrar menú"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="flex-1 py-2 overflow-y-auto">
              {navLinks}
            </div>

            <div className="p-4 border-t text-xs text-muted" style={{ borderColor: "var(--border)" }}>
              <p className="truncate font-medium" style={{ color: "var(--text)" }}>{user?.email}</p>
              <p className="capitalize text-[11px] mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

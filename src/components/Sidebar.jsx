import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  IconLogo,
  IconDashboard,
  IconReports,
  IconSparkles,
  IconTarget,
  IconKanban,
  IconOrg,
  IconIntegrations,
  IconShield,
  IconUsers,
  IconUser,
  IconSettings,
  IconX,
} from "./icons";

const NAV_SECTIONS = [
  {
    title: "Analítica & BI",
    items: [
      { to: "/", label: "Dashboard Ejecutivo", icon: IconDashboard, end: true },
      { to: "/intelligence", label: "Inteligencia & IA", icon: IconSparkles, badge: "Argon" },
      { to: "/reports", label: "Reportes Financieros", icon: IconReports },
    ],
  },
  {
    title: "Ambiente Laboral",
    items: [
      { to: "/goals", label: "Metas & OKRs", icon: IconTarget },
      { to: "/workspace", label: "Tablero Operativo", icon: IconKanban },
      { to: "/integrations", label: "Integraciones", icon: IconIntegrations },
    ],
  },
  {
    title: "Gobernanza Multi-Empresa",
    items: [
      { to: "/organizations", label: "Empresas & Equipos", icon: IconOrg },
      { to: "/audit", label: "Auditoría & Seguridad", icon: IconShield },
      { to: "/users", label: "Usuarios Globales", icon: IconUsers, adminOnly: true },
      { to: "/profile", label: "Mi Perfil", icon: IconUser },
      { to: "/settings", label: "Ajustes", icon: IconSettings },
    ],
  },
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
    <nav className="grid gap-1 px-3 pb-4" aria-label="Navegación principal">
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter(
          (i) => !i.adminOnly || user?.role === "admin"
        );
        if (!visibleItems.length) return null;
        return (
          <div key={section.title} className="mb-1">
            <p className="nav-section-title">{section.title}</p>
            <div className="grid gap-0.5">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={itemClass}
                  onClick={() => {
                    if (mobileOpen && onClose) onClose();
                  }}
                >
                  <item.icon size={17} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="chip chip-accent !h-4 !px-1.5 !text-[10px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Sidebar para desktop */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen border-r"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        aria-label="Barra lateral"
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div
            className="w-8 h-8 rounded-lg grid place-items-center text-white shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            <IconLogo size={18} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold tracking-tight">BDAP</p>
              <span className="chip chip-accent !h-4 !px-1.5 !text-[10px] font-semibold">v2.0</span>
            </div>
            <p className="text-[11px] text-muted truncate">Enterprise Workplace BI</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-1">
          {navLinks}
        </div>

        <div className="mt-auto px-4 py-3 text-[11px] text-muted border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span>Motor Multi-Tenant</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Activo
          </span>
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
            className="w-64 max-w-[82%] h-full flex flex-col shadow-2xl"
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
                  <p className="font-semibold tracking-tight">BDAP v2.0</p>
                  <p className="text-[11px] text-muted">Enterprise Suite</p>
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

            <div className="flex-1 py-1 overflow-y-auto">
              {navLinks}
            </div>

            <div className="p-4 border-t text-xs text-muted" style={{ borderColor: "var(--border)" }}>
              <p className="truncate font-medium" style={{ color: "var(--text)" }}>{user?.name || user?.email}</p>
              <p className="capitalize text-[11px] mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

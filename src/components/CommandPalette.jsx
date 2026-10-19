import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useGet } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import {
  IconSearch,
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
  IconChevronRight,
} from "./icons";

const NAV_COMMANDS = [
  { id: "nav-dash", label: "Dashboard Ejecutivo", category: "Módulos", to: "/", icon: IconDashboard },
  { id: "nav-intel", label: "Inteligencia & Pronósticos (Argon AI)", category: "Módulos", to: "/intelligence", icon: IconSparkles },
  { id: "nav-goals", label: "Metas & OKRs Corporativos", category: "Ambiente Laboral", to: "/goals", icon: IconTarget },
  { id: "nav-work", label: "Tablero Operativo & Tareas", category: "Ambiente Laboral", to: "/workspace", icon: IconKanban },
  { id: "nav-reports", label: "Reportes Financieros", category: "Módulos", to: "/reports", icon: IconReports },
  { id: "nav-orgs", label: "Centro Multi-Empresa & Equipos", category: "Gobernanza", to: "/organizations", icon: IconOrg },
  { id: "nav-int", label: "Integraciones en Tiempo Real", category: "Módulos", to: "/integrations", icon: IconIntegrations },
  { id: "nav-audit", label: "Auditoría & Trazabilidad", category: "Gobernanza", to: "/audit", icon: IconShield },
  { id: "nav-users", label: "Administración de Usuarios", category: "Gobernanza", to: "/users", icon: IconUsers, adminOnly: true },
  { id: "nav-prof", label: "Mi Perfil Corporativo", category: "Cuenta", to: "/profile", icon: IconUser },
  { id: "nav-set", label: "Ajustes de Seguridad", category: "Cuenta", to: "/settings", icon: IconSettings },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const { user, switchOrg } = useAuth();
  const { data: orgs } = useGet("/organizations", {}, { enabled: Boolean(user) });
  const { data: reports } = useGet("/reports", {}, { enabled: Boolean(user?.orgId) });

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else window.dispatchEvent(new CustomEvent("bdap:open-command-palette"));
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];

    // 1. Módulos
    for (const cmd of NAV_COMMANDS) {
      if (cmd.adminOnly && user?.role !== "admin") continue;
      if (!q || cmd.label.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)) {
        list.push({
          ...cmd,
          action: () => {
            navigate(cmd.to);
            onClose();
          },
        });
      }
    }

    // 2. Cambio rápido de empresa
    for (const o of orgs || []) {
      const label = `Cambiar a empresa: ${o.name} (${o.industry || "Enterprise"})`;
      if (!q || label.toLowerCase().includes(q)) {
        list.push({
          id: `org-${o.id}`,
          label,
          category: "Multi-Empresa",
          icon: IconOrg,
          badge: o.id === user?.orgId ? "Activa" : o.plan?.toUpperCase(),
          action: async () => {
            if (o.id !== user?.orgId) {
              await switchOrg(o.id);
              toast.success(`Contexto cambiado a ${o.name}`);
            }
            onClose();
          },
        });
      }
    }

    // 3. Reportes de la empresa
    for (const r of reports || []) {
      const label = `Abrir reporte: ${r.name}`;
      if (!q || label.toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q)) {
        list.push({
          id: `rep-${r.id}`,
          label,
          category: "Reportes",
          icon: IconReports,
          badge: r.category || "Finanzas",
          action: () => {
            navigate(`/reports/${r.id}`);
            onClose();
          },
        });
      }
    }

    return list;
  }, [query, user, orgs, reports, navigate, onClose, switchOrg, toast]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Buscador rápido de comandos"
    >
      <div
        className="card w-full max-w-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <IconSearch size={18} className="text-muted shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar módulo, cambiar de empresa o abrir reporte…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon h-7 w-7"
            aria-label="Cerrar"
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y" style={{ borderColor: "var(--border)" }}>
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No se encontraron comandos ni recursos para &quot;{query}&quot;
            </div>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={item.action}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-surface-2 transition-colors"
                      style={{ color: "var(--text)" }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-md grid place-items-center shrink-0"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          <ItemIcon size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.label}</p>
                          <p className="text-[11px] text-muted">{item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span className="chip text-[11px]">{item.badge}</span>
                        )}
                        <IconChevronRight size={14} className="text-muted" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="px-4 py-2 border-t flex items-center justify-between text-[11px] text-muted"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <span>Navegación rápida Multi-Empresa · BDAP Argon</span>
          <span>ESC para cerrar</span>
        </div>
      </div>
    </div>
  );
}

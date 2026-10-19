import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useGet } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "./ThemeToggle";
import { IconLogo, IconLogout, IconOrg, IconMenu, IconSearch } from "./icons";

export default function NavBar({ onToggleMobileMenu, onOpenCommandPalette }) {
  const { user, logout, switchOrg } = useAuth();
  const toast = useToast();
  const { data: orgs = [], isLoading: loadingOrgs } = useGet(
    "/organizations",
    {},
    { enabled: Boolean(user) }
  );

  const currentOrg = orgs.find((o) => o.id === user?.orgId);

  const handleOrgChange = async (e) => {
    const nextOrgId = Number(e.target.value);
    if (!nextOrgId || nextOrgId === user?.orgId) return;
    try {
      await switchOrg(nextOrgId);
      const target = orgs.find((o) => o.id === nextOrgId);
      toast.success(`Empresa activa: ${target?.name || `#${nextOrgId}`}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo cambiar de organización");
    }
  };

  return (
    <header
      className="sticky top-0 z-40 h-16 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="h-full px-4 md:px-8 flex items-center gap-3">
        {/* Botón menú hamburguesa en móvil */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden btn btn-ghost btn-sm btn-icon -ml-1"
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <IconMenu size={20} />
        </button>

        {/* Marca visible solo en móvil */}
        <Link to="/" className="md:hidden flex items-center gap-2 font-semibold">
          <span
            className="w-7 h-7 rounded-lg grid place-items-center text-white"
            style={{ background: "var(--accent)" }}
          >
            <IconLogo size={16} />
          </span>
          BDAP
        </Link>

        {/* Buscador Rápido / Command Palette (Ctrl+K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center justify-between gap-4 px-3 h-9 rounded-lg border text-xs text-muted hover:border-accent/50 transition-colors w-64 lg:w-80"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          title="Abrir paleta de comandos (Ctrl+K)"
        >
          <span className="flex items-center gap-2 truncate">
            <IconSearch size={14} />
            <span>Buscar módulos, empresas o reportes…</span>
          </span>
          <kbd
            className="px-1.5 py-0.5 text-[10px] font-mono rounded border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="sm:hidden btn btn-ghost btn-sm btn-icon"
            title="Buscar"
            aria-label="Buscar"
          >
            <IconSearch size={16} />
          </button>

          {user?.orgId != null && orgs.length > 0 && (
            <div className="flex items-center gap-1.5">
              {currentOrg?.plan && (
                <span className="hidden lg:inline-flex chip chip-accent uppercase text-[10px] font-semibold">
                  {currentOrg.plan}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-muted">
                <IconOrg size={16} className="hidden sm:inline" />
                <select
                  className="select select-sm w-40 sm:w-52 text-xs sm:text-sm font-medium"
                  value={user.orgId ?? ""}
                  onChange={handleOrgChange}
                  disabled={loadingOrgs}
                  aria-label="Empresa activa"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.currency || "USD"}) · {o.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-2 pl-2.5 border-l" style={{ borderColor: "var(--border)" }}>
            <div className="leading-tight text-right">
              <p className="text-[13px] font-medium truncate max-w-[150px]">{user?.name || user?.email}</p>
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

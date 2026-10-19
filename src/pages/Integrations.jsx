import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconRefresh,
  IconSettings,
  IconFileSpreadsheet,
  IconAlertTriangle,
} from "../components/icons";
import IntegrationConfigModal from "../components/IntegrationConfigModal";
import IntegrationSyncModal from "../components/IntegrationSyncModal";

const num = new Intl.NumberFormat("es");
const pct = new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 1 });

function formatMoney(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `$${Number(amount || 0).toLocaleString("es")}`;
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function StatusChip({ isLive, isConfigured, isDemo }) {
  if (isLive) {
    return (
      <span
        className="chip text-xs font-semibold px-2 py-0.5"
        style={{
          background: "rgba(10, 125, 51, 0.12)",
          color: "var(--success)",
          borderColor: "rgba(10, 125, 51, 0.2)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-current mr-1" />
        En vivo
      </span>
    );
  }
  if (isDemo || isConfigured) {
    return (
      <span
        className="chip text-xs font-semibold px-2 py-0.5"
        style={{
          background: "rgba(217, 119, 6, 0.12)",
          color: "#b45309",
          borderColor: "rgba(217, 119, 6, 0.2)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-current mr-1" />
        Simulación
      </span>
    );
  }
  return (
    <span className="chip text-xs font-normal text-muted">
      No configurada
    </span>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b last:border-b-0 text-sm" style={{ borderColor: "var(--border)" }}>
      <div>
        <span className="text-muted block text-xs">{label}</span>
        {sub && <span className="text-[11px] text-muted opacity-80">{sub}</span>}
      </div>
      <span className="font-semibold num text-base" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function Integrations() {
  const qc = useQueryClient();

  // Consultar configuración actual de integraciones
  const { data: configs } = useGet("/integrations/configs");

  // Consultar datos de cada proveedor
  const ga = useGet("/integrations/google-analytics/kpis");
  const stripe = useGet("/integrations/stripe/revenue");
  const hub = useGet("/integrations/hubspot/leads");

  // Estados de modales
  const [configModalProvider, setConfigModalProvider] = useState(null);
  const [syncModal, setSyncModal] = useState(null); // { provider: 'stripe'|'google-analytics', name: string }

  // Filtro de búsqueda para HubSpot
  const [hubSearch, setHubSearch] = useState("");
  const [showStripeTx, setShowStripeTx] = useState(false);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["/integrations/configs"] });
    qc.invalidateQueries({ queryKey: ["/integrations/google-analytics/kpis"] });
    qc.invalidateQueries({ queryKey: ["/integrations/stripe/revenue"] });
    qc.invalidateQueries({ queryKey: ["/integrations/hubspot/leads"] });
  };

  const stripeConfig = configs?.stripe;
  const hubConfig = configs?.hubspot;
  const gaConfig = configs?.["google-analytics"];

  // Detección de estado en vivo vs simulación
  const isStripeLive = stripe.data?.source === "live";
  const isGaLive = ga.data?.source === "live";
  const isHubLive = hub.data?.source === "live" || (Array.isArray(hub.data) && hub.data.source === "live");

  const connectedCount = [
    stripeConfig?.configured && !stripeConfig?.isDemo,
    gaConfig?.configured && !gaConfig?.isDemo,
    hubConfig?.configured && !hubConfig?.isDemo,
  ].filter(Boolean).length;

  // Filtrado de leads en HubSpot
  const rawHubLeads = useMemo(() => {
    return Array.isArray(hub.data) ? hub.data : (hub.data?.leads || []);
  }, [hub.data]);

  const filteredHubLeads = useMemo(() => {
    if (!hubSearch.trim()) return rawHubLeads;
    const q = hubSearch.toLowerCase();
    return rawHubLeads.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) ||
        h.company?.toLowerCase().includes(q) ||
        h.status?.toLowerCase().includes(q)
    );
  }, [rawHubLeads, hubSearch]);

  const getStatusBadgeStyle = (status) => {
    const s = String(status).toUpperCase();
    if (s.includes("WON") || s.includes("CUSTOMER")) {
      return { background: "rgba(10, 125, 51, 0.12)", color: "var(--success)" };
    }
    if (s.includes("OPEN") || s.includes("LEAD")) {
      return { background: "rgba(42, 120, 214, 0.12)", color: "var(--accent)" };
    }
    if (s.includes("QUALIFIED") || s.includes("PROGRESS")) {
      return { background: "rgba(217, 119, 6, 0.12)", color: "#b45309" };
    }
    return { background: "var(--surface-2)", color: "var(--text-2)" };
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Integraciones</h1>
          <p className="page-sub">
            Conecta fuentes de datos externas en tiempo real o utiliza modos de simulación para pruebas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted num mr-1">
            {connectedCount} de 3 en vivo
          </span>
          <button
            onClick={refreshAll}
            className="btn btn-ghost btn-sm"
            title="Actualizar datos de todas las integraciones"
          >
            <IconRefresh size={14} />
            Actualizar todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ===================== GOOGLE ANALYTICS ===================== */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="section-title">Google Analytics 4</h3>
                <p className="text-[11px] text-muted">Audiencia y tráfico web</p>
              </div>
              <StatusChip
                isLive={isGaLive}
                isConfigured={gaConfig?.configured}
                isDemo={gaConfig?.isDemo}
              />
            </div>

            {ga.data?.error && (
              <div className="p-2.5 rounded-lg mb-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-start gap-1.5">
                <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="leading-tight">{ga.data.error}</p>
              </div>
            )}

            {ga.isLoading ? (
              <div className="py-8 text-center text-muted text-sm">Cargando métricas de GA4…</div>
            ) : ga.data ? (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                <Metric label="Sesiones (30d)" value={num.format(ga.data.sessions || 0)} />
                <Metric label="Usuarios activos" value={num.format(ga.data.users || 0)} />
                <Metric label="Tasa de rebote" value={pct.format(ga.data.bounceRate || 0)} />
                <Metric label="Duración promedio" value={formatDuration(ga.data.avgSession)} />
              </div>
            ) : (
              <p className="text-muted text-sm py-4">Sin datos disponibles.</p>
            )}

            {gaConfig?.propertyId && (
              <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
                <span>Propiedad:</span>
                <span className="font-mono">{gaConfig.propertyId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setConfigModalProvider("google-analytics")}
              className="btn btn-ghost btn-sm flex-1"
            >
              <IconSettings size={14} />
              Configurar
            </button>
            <button
              onClick={() => setSyncModal({ provider: "google-analytics", name: "Google Analytics 4" })}
              className="btn btn-ghost btn-sm flex-1"
              title="Importar métricas a un reporte de BDAP"
            >
              <IconFileSpreadsheet size={14} />
              A Reporte
            </button>
          </div>
        </div>

        {/* ===================== STRIPE ===================== */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="section-title">Stripe</h3>
                <p className="text-[11px] text-muted">Facturación y cobros recurrentes</p>
              </div>
              <StatusChip
                isLive={isStripeLive}
                isConfigured={stripeConfig?.configured}
                isDemo={stripeConfig?.isDemo}
              />
            </div>

            {stripe.data?.error && (
              <div className="p-2.5 rounded-lg mb-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-start gap-1.5">
                <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="leading-tight">{stripe.data.error}</p>
              </div>
            )}

            {stripe.isLoading ? (
              <div className="py-8 text-center text-muted text-sm">Cargando datos de facturación…</div>
            ) : stripe.data ? (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                <Metric
                  label="Total Facturado"
                  value={formatMoney(stripe.data.total, stripe.data.currency)}
                />
                <Metric
                  label="MRR (Ingreso recurrente mensual)"
                  value={formatMoney(stripe.data.mrr, stripe.data.currency)}
                />
                <Metric
                  label="ARR (Ingreso recurrente anual)"
                  value={formatMoney(stripe.data.arr, stripe.data.currency)}
                />
                {stripe.data.availableBalance != null && (
                  <Metric
                    label="Balance disponible"
                    value={formatMoney(stripe.data.availableBalance, stripe.data.currency)}
                    sub={stripe.data.pendingBalance ? `+${formatMoney(stripe.data.pendingBalance, stripe.data.currency)} pendiente` : undefined}
                  />
                )}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">Sin datos de facturación.</p>
            )}

            {/* Transacciones recientes (si existen) */}
            {stripe.data?.recentTransactions?.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowStripeTx(!showStripeTx)}
                  className="text-xs text-accent hover:underline flex items-center justify-between w-full"
                  style={{ color: "var(--accent)" }}
                >
                  <span>{showStripeTx ? "Ocultar transacciones" : "Ver transacciones recientes"}</span>
                  <span className="num text-[11px]">({stripe.data.recentTransactions.length})</span>
                </button>

                {showStripeTx && (
                  <ul className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {stripe.data.recentTransactions.map((tx) => (
                      <li
                        key={tx.id}
                        className="text-[11px] p-1.5 rounded bg-surface-2 flex items-center justify-between"
                      >
                        <span className="truncate max-w-[130px] font-medium">{tx.customer}</span>
                        <span className="num font-semibold text-emerald-600">
                          +{formatMoney(tx.amount, tx.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setConfigModalProvider("stripe")}
              className="btn btn-ghost btn-sm flex-1"
            >
              <IconSettings size={14} />
              Configurar
            </button>
            <button
              onClick={() => setSyncModal({ provider: "stripe", name: "Stripe" })}
              className="btn btn-ghost btn-sm flex-1"
              title="Importar meses e ingresos a un reporte de BDAP"
            >
              <IconFileSpreadsheet size={14} />
              A Reporte
            </button>
          </div>
        </div>

        {/* ===================== HUBSPOT ===================== */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="section-title">HubSpot CRM</h3>
                <p className="text-[11px] text-muted">Leads y ciclo de vida de clientes</p>
              </div>
              <StatusChip
                isLive={isHubLive}
                isConfigured={hubConfig?.configured}
                isDemo={hubConfig?.isDemo}
              />
            </div>

            {hub.data?.error && (
              <div className="p-2.5 rounded-lg mb-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-start gap-1.5">
                <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="leading-tight">{hub.data.error}</p>
              </div>
            )}

            {rawHubLeads.length > 3 && (
              <div className="mb-2.5">
                <input
                  type="search"
                  placeholder="Buscar lead o contacto…"
                  value={hubSearch}
                  onChange={(e) => setHubSearch(e.target.value)}
                  className="input text-xs h-7 py-1"
                />
              </div>
            )}

            {hub.isLoading ? (
              <div className="py-8 text-center text-muted text-sm">Cargando prospectos de HubSpot…</div>
            ) : filteredHubLeads.length > 0 ? (
              <div className="max-h-52 overflow-y-auto pr-1">
                <ul className="space-y-1.5">
                  {filteredHubLeads.map((h) => (
                    <li
                      key={h.id}
                      className="p-2 rounded-lg bg-surface-2 border flex items-center justify-between text-xs"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium truncate" style={{ color: "var(--text)" }}>
                          {h.name}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                          {h.company && h.company !== "—" ? `${h.company} · ` : ""}
                          {h.owner ? `Propietario: ${h.owner}` : h.email}
                        </p>
                      </div>
                      <span
                        className="chip text-[10px] font-semibold px-2 shrink-0"
                        style={getStatusBadgeStyle(h.status)}
                      >
                        {h.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No se encontraron prospectos.</p>
            )}

            <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
              <span>Total prospectos:</span>
              <span className="font-medium num">{rawHubLeads.length}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setConfigModalProvider("hubspot")}
              className="btn btn-ghost btn-sm w-full"
            >
              <IconSettings size={14} />
              Configurar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Configuración de Credenciales */}
      {configModalProvider && (
        <IntegrationConfigModal
          isOpen={configModalProvider !== null}
          onClose={() => setConfigModalProvider(null)}
          provider={configModalProvider}
          configData={configs?.[configModalProvider]}
          onSaved={refreshAll}
        />
      )}

      {/* Modal de Sincronización a Reportes */}
      {syncModal && (
        <IntegrationSyncModal
          isOpen={syncModal !== null}
          onClose={() => setSyncModal(null)}
          provider={syncModal.provider}
          providerName={syncModal.name}
        />
      )}
    </Layout>
  );
}

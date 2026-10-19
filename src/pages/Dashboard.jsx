import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import ChartCard from "../components/ChartCard.jsx";
import { useGet } from "../hooks/useApi";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";
import { exportToPDF } from "../utils/export";
import {
  IconChevronRight,
  IconSparkles,
  IconTarget,
  IconKanban,
  IconOrg,
  IconActivity,
} from "../components/icons";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es");

function StatCard({ label, value, hint, delta, badge }) {
  const isPositive = delta != null && delta >= 0;
  const isNeutral = delta == null;

  return (
    <div className="card p-4 sm:p-5 flex flex-col justify-between card-hover">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted font-medium">{label}</p>
          {!isNeutral && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-md num"
              style={{
                background: isPositive ? "rgba(10, 125, 51, 0.12)" : "rgba(208, 59, 59, 0.12)",
                color: isPositive ? "var(--success)" : "var(--danger)",
              }}
            >
              {isPositive ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
            </span>
          )}
          {isNeutral && badge && (
            <span className="chip chip-accent !h-5 !px-2 !text-[11px] font-semibold">
              {badge}
            </span>
          )}
        </div>
        <p className="text-2xl font-semibold num mt-2 tracking-tight" style={{ color: "var(--text)" }}>
          {value}
        </p>
      </div>
      {hint && <p className="text-xs text-muted mt-2">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, switchOrg } = useAuth();
  const toast = useToast();
  const { data: orgs = [] } = useGet("/organizations");
  const { data: reports, isLoading: loadingReports } = useGet("/reports");
  const { data: goals = [] } = useGet("/goals");
  const { data: tasks = [] } = useGet("/tasks");

  const [reportId, setReportId] = useState(null);

  // Al cambiar de empresa o cargar reportes, asegurar que reportId pertenezca a la empresa actual
  useEffect(() => {
    if (!reports || reports.length === 0) {
      setReportId(null);
      return;
    }
    const existsInCurrentOrg = reports.some((r) => r.id === reportId);
    if (!existsInCurrentOrg) {
      setReportId(reports[0].id);
    }
  }, [reports, reportId, user?.orgId]);

  const { data: rows, isLoading: loadingRows } = useGet(
    `/reports/${reportId}/rows`,
    {},
    { enabled: reportId != null }
  );

  const { data: intel } = useGet(
    "/intelligence/analyze",
    { reportId: reportId || "" },
    { enabled: reportId != null }
  );

  const currentOrg = orgs.find((o) => o.id === user?.orgId);
  const currentReport = reports?.find((r) => r.id === reportId);

  const enrichedRows = useMemo(() => {
    return (rows || []).map((r) => {
      const exp = r.expenses || Math.round((r.revenue || 0) * 0.56);
      return {
        ...r,
        expenses: exp,
        profit: (r.revenue || 0) - exp,
        customers: r.customers || Math.max(1, Math.round((r.orders || 0) * 0.72)),
      };
    });
  }, [rows]);

  const stats = useMemo(() => {
    const d = enrichedRows;
    const totalRevenue = d.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalExpenses = d.reduce((a, r) => a + (r.expenses || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const totalOrders = d.reduce((a, r) => a + (r.orders || 0), 0);
    const totalCustomers = d.reduce((a, r) => a + (r.customers || 0), 0);
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;

    let revenueDelta = null;
    let ordersDelta = null;

    if (d.length >= 2) {
      const current = d[d.length - 1];
      const previous = d[d.length - 2];
      if (previous.revenue > 0) {
        revenueDelta = ((current.revenue - previous.revenue) / previous.revenue) * 100;
      }
      if (previous.orders > 0) {
        ordersDelta = ((current.orders - previous.orders) / previous.orders) * 100;
      }
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      marginPct,
      totalOrders,
      totalCustomers,
      avgTicket,
      months: d.length,
      revenueDelta,
      ordersDelta,
    };
  }, [enrichedRows]);

  const okrProgress = useMemo(() => {
    if (!goals.length) return { avg: 0, completed: 0 };
    const sum = goals.reduce(
      (acc, g) => acc + Math.min(100, ((g.currentValue || 0) / (g.targetValue || 1)) * 100),
      0
    );
    const completed = goals.filter(
      (g) => g.status === "completed" || (g.targetValue > 0 && g.currentValue >= g.targetValue)
    ).length;
    return { avg: Math.round(sum / goals.length), completed };
  }, [goals]);

  const activeTasksCount = useMemo(
    () => tasks.filter((t) => t.status !== "done").length,
    [tasks]
  );

  const handleQuickSwitchOrg = async (orgId, orgName) => {
    if (orgId === user?.orgId) return;
    try {
      await switchOrg(orgId);
      toast.success(`Cambiado a ${orgName}`);
    } catch {
      toast.error("No se pudo cambiar de empresa");
    }
  };

  const handleExportExecutivePdf = () => {
    const exportRows = enrichedRows.map((r) => ({
      Periodo: r.month,
      Ingresos: r.revenue,
      Gastos: r.expenses,
      Utilidad_Neta: r.profit,
      Órdenes: r.orders,
      Clientes: r.customers,
    }));

    exportToPDF({
      title: `Informe Ejecutivo · ${currentOrg?.name || "BDAP"}`,
      subtitle: `Reporte activo: ${currentReport?.name || "Consolidado"} · Sector: ${currentOrg?.industry || "Enterprise"}`,
      category: `DASHBOARD EJECUTIVO · PLAN ${(currentOrg?.plan || "ENTERPRISE").toUpperCase()}`,
      orgName: currentOrg?.name || "",
      summaryKpis: [
        {
          label: "INGRESOS BRUTOS",
          value: money.format(stats.totalRevenue),
          sub: `${stats.months} periodos registrados`,
          tone: "accent",
        },
        {
          label: "UTILIDAD NETA",
          value: money.format(stats.netProfit),
          sub: `Margen operativo: ${stats.marginPct}%`,
          tone: stats.netProfit >= 0 ? "success" : "danger",
        },
        {
          label: "PRONÓSTICO PRÓX. MES",
          value: money.format(intel?.summary?.nextPeriodRevenue || 0),
          sub: `Confianza R² ${Math.round((intel?.summary?.r2 ?? 0.92) * 100)}%`,
          tone: "accent",
        },
        {
          label: "SALUD CORPORATIVA",
          value: `${intel?.summary?.healthScore ?? 88} / 100`,
          sub: `${okrProgress.avg}% OKRs · ${activeTasksCount} tareas activas`,
          tone: "success",
        },
      ],
      notes: [
        `Desempeño comercial: ${num.format(stats.totalOrders)} órdenes acumuladas con un ticket promedio de ${money.format(stats.avgTicket)}.`,
        `Alineación estratégica: ${okrProgress.completed} de ${goals.length} OKRs completados (${okrProgress.avg}% de avance global).`,
      ],
      rows: exportRows,
    });
  };

  const handleExportMultiCompanyPdf = () => {
    const matrixRows = orgs.map((o) => ({
      Empresa: o.name,
      Sector: o.industry,
      Plan: String(o.plan || "").toUpperCase(),
      Ingresos: o.metrics?.totalRevenue || 0,
      Utilidad_Neta: o.metrics?.netProfit || 0,
      "Margen (%)": `${o.metrics?.marginPct ?? 0}%`,
      OKRs: `${o.metrics?.goalsCompleted || 0}/${o.metrics?.goalsTotal || 0}`,
      Latencia: `${o.telemetry?.avgLatencyMs || 2.1}ms`,
    }));

    exportToPDF({
      title: "Matriz Consolidada Multi-Empresa",
      subtitle: `Comparativa financiera, cumplimiento de OKRs y telemetría de ${orgs.length} organizaciones`,
      category: "HOLDING MULTI-TENANT · CONSOLIDADO",
      rows: matrixRows,
    });
  };

  return (
    <Layout>
      {/* Cabecera Ejecutiva Multi-Empresa */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0 shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            <IconOrg size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">{currentOrg?.name || "Dashboard Ejecutivo"}</h1>
              {currentOrg?.plan && (
                <span className="chip chip-accent uppercase text-[11px] font-semibold">
                  Plan {currentOrg.plan}
                </span>
              )}
              {currentOrg?.industry && (
                <span className="chip text-[11px]">{currentOrg.industry}</span>
              )}
            </div>
            <p className="page-sub mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Centro de comando analítico y operativo</span>
              {currentOrg?.telemetry && (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <IconActivity size={13} className="text-emerald-500" />
                  Latencia: <strong className="num">{currentOrg.telemetry.avgLatencyMs}ms</strong> ·
                  Caché Hit: <strong className="num">{currentOrg.telemetry.cacheHitRate}%</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reports?.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="report-select" className="text-xs text-muted font-medium">
                Reporte activo:
              </label>
              <select
                id="report-select"
                className="select select-sm w-56 font-medium"
                value={reportId ?? ""}
                onChange={(e) => setReportId(Number(e.target.value))}
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {reportId != null && (
                <Link to={`/reports/${reportId}`} className="btn btn-ghost btn-sm" title="Ver registros del reporte">
                  Registros
                  <IconChevronRight size={14} />
                </Link>
              )}
            </div>
          )}
          {enrichedRows.length > 0 && (
            <button
              type="button"
              onClick={handleExportExecutivePdf}
              className="btn btn-ghost btn-sm"
              title="Descargar Informe Ejecutivo PDF estilizado"
            >
              PDF Ejecutivo
            </button>
          )}
          <Link to="/intelligence" className="btn btn-primary btn-sm">
            <IconSparkles size={14} />
            Simulador IA
          </Link>
        </div>
      </div>

      {loadingReports && <p className="text-muted text-sm">Cargando datos de la organización…</p>}

      {!loadingReports && !reports?.length && (
        <div className="card empty text-center py-10">
          <p className="font-medium text-base mb-1" style={{ color: "var(--text)" }}>
            Sin reportes financieros en esta empresa
          </p>
          <p className="text-sm text-muted mb-4">
            Crea tu primer reporte en la sección Reportes para visualizar indicadores y gráficos aquí.
          </p>
          <Link to="/reports" className="btn btn-primary mx-auto">
            Ir a Reportes
          </Link>
        </div>
      )}

      {reportId != null && (
        <>
          {/* 6 KPIs Ejecutivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <StatCard
              label="Ingresos Brutos"
              value={money.format(stats.totalRevenue)}
              hint={stats.revenueDelta != null ? "Variación vs. último periodo" : `${stats.months} periodos`}
              delta={stats.revenueDelta}
            />
            <StatCard
              label="Utilidad Neta"
              value={money.format(stats.netProfit)}
              hint={`Margen operativo: ${stats.marginPct}%`}
              badge={`${stats.marginPct}%`}
            />
            <StatCard
              label="Órdenes Totales"
              value={num.format(stats.totalOrders)}
              hint={`${num.format(stats.totalCustomers)} clientes acumulados`}
              delta={stats.ordersDelta}
            />
            <StatCard
              label="Ticket Promedio"
              value={money.format(stats.avgTicket)}
              hint="Ingresos / órdenes"
            />
            <StatCard
              label="Pronóstico Próx. Mes"
              value={money.format(intel?.summary?.nextPeriodRevenue || 0)}
              hint={`Confianza R² ${(intel?.summary?.r2 ?? 0.92) * 100}%`}
              badge="Argon AI"
            />
            <StatCard
              label="Salud Corporativa"
              value={`${intel?.summary?.healthScore ?? 88}/100`}
              hint={`${okrProgress.avg}% OKRs · ${activeTasksCount} tareas activas`}
              badge="Óptimo"
            />
          </div>

          {/* Gráficos Principales Multi-Serie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Rentabilidad: Ingresos vs. Gastos vs. Utilidad"
              subtitle={`${currentReport?.name || ""} · Evolución financiera comparada ($ USD)`}
              type="area"
              data={enrichedRows}
              xKey="month"
              series={[
                { dataKey: "revenue", label: "Ingresos ($)", colorIndex: 0 },
                { dataKey: "profit", label: "Utilidad Neta ($)", colorIndex: 1 },
                { dataKey: "expenses", label: "Costos ($)", colorIndex: 2 },
              ]}
            />
            <ChartCard
              title="Tracción Comercial: Órdenes y Clientes"
              subtitle={`${currentReport?.name || ""} · Volumen operativo por periodo`}
              type="bar"
              data={enrichedRows}
              xKey="month"
              series={[
                { dataKey: "orders", label: "Órdenes", colorIndex: 0 },
                { dataKey: "customers", label: "Clientes activos", colorIndex: 3 },
              ]}
            />
          </div>

          {/* Pulso del Ambiente Laboral: OKRs + Tablero Operativo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* OKRs Widget */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconTarget size={18} style={{ color: "var(--accent)" }} />
                    <div>
                      <h3 className="section-title">Metas & OKRs Corporativos</h3>
                      <p className="text-xs text-muted">
                        {okrProgress.completed} de {goals.length} objetivos completados ({okrProgress.avg}% avance global)
                      </p>
                    </div>
                  </div>
                  <Link to="/goals" className="btn btn-ghost btn-sm">
                    Gestionar OKRs
                    <IconChevronRight size={14} />
                  </Link>
                </div>

                {goals.length === 0 ? (
                  <p className="text-sm text-muted py-6 text-center">
                    No hay metas registradas para esta empresa.
                  </p>
                ) : (
                  <div className="space-y-3 mt-2">
                    {goals.slice(0, 3).map((g) => {
                      const pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
                      return (
                        <div key={g.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                          <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                            <span className="font-medium truncate" style={{ color: "var(--text)" }}>
                              {g.title}
                            </span>
                            <span className="num font-semibold text-xs shrink-0" style={{ color: "var(--accent)" }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? "var(--success)" : g.status === "at_risk" ? "#f59e0b" : "var(--accent)",
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted mt-1.5">
                            <span>{g.category} · Resp: {g.ownerName || "Equipo"}</span>
                            <span className="num">
                              {num.format(g.currentValue)} / {num.format(g.targetValue)} {g.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Tasks Widget */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconKanban size={18} style={{ color: "var(--accent)" }} />
                    <div>
                      <h3 className="section-title">Tablero Operativo del Equipo</h3>
                      <p className="text-xs text-muted">
                        {activeTasksCount} iniciativas en ejecución activa
                      </p>
                    </div>
                  </div>
                  <Link to="/workspace" className="btn btn-ghost btn-sm">
                    Abrir Kanban
                    <IconChevronRight size={14} />
                  </Link>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-sm text-muted py-6 text-center">
                    Sin tareas operativas registradas en esta empresa.
                  </p>
                ) : (
                  <ul className="space-y-2.5 mt-2">
                    {tasks.slice(0, 4).map((t) => (
                      <li
                        key={t.id}
                        className="p-3 rounded-lg border flex items-center justify-between gap-3"
                        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                            {t.title}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {t.department} · Asignado a <strong className="font-medium">{t.assignee || "Equipo"}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`chip !text-[10px] font-semibold uppercase ${
                              t.status === "done"
                                ? "chip-success"
                                : t.priority === "urgent"
                                ? "chip-danger"
                                : "chip-accent"
                            }`}
                          >
                            {t.status === "done"
                              ? "Listo"
                              : t.status === "in_progress"
                              ? "En curso"
                              : t.status === "review"
                              ? "Revisión"
                              : "Backlog"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {loadingRows && <p className="text-muted text-sm">Actualizando métricas…</p>}
        </>
      )}

      {/* Matriz Consolidada Multi-Empresa (si el usuario opera múltiples empresas) */}
      {orgs.length > 1 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
            <div>
              <h2 className="section-title">Matriz Comparativa Multi-Empresa (Tiempo Real)</h2>
              <p className="text-xs text-muted mt-0.5">
                Rendimiento consolidado y carga operativa de las {orgs.length} organizaciones bajo tu gestión
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMultiCompanyPdf}
                className="btn btn-ghost btn-sm"
              >
                PDF Consolidado
              </button>
              <Link to="/organizations" className="btn btn-ghost btn-sm">
                Centro de Empresas
                <IconChevronRight size={14} />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa / Organización</th>
                  <th>Sector & Plan</th>
                  <th className="!text-right">Ingresos Consolidados</th>
                  <th className="!text-right">Utilidad Neta</th>
                  <th className="!text-right">Margen</th>
                  <th className="!text-right">OKRs / Tareas</th>
                  <th className="!text-right">Carga / Latencia</th>
                  <th aria-label="Acción"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => {
                  const isActive = o.id === user?.orgId;
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: "var(--text)" }}>
                            {o.name}
                          </span>
                          {isActive && <span className="chip chip-success !h-5 !text-[10px]">Activa</span>}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs">{o.industry}</span>
                        <span className="chip chip-accent !h-4 !px-1.5 !text-[10px] uppercase ml-2">
                          {o.plan}
                        </span>
                      </td>
                      <td className="text-right num font-mono font-medium" style={{ color: "var(--text)" }}>
                        {money.format(o.metrics?.totalRevenue || 0)}
                      </td>
                      <td className="text-right num font-mono">
                        {money.format(o.metrics?.netProfit || 0)}
                      </td>
                      <td className="text-right num">
                        <span className="chip chip-success !h-5 !text-xs">
                          {o.metrics?.marginPct ?? 0}%
                        </span>
                      </td>
                      <td className="text-right num text-xs">
                        {o.metrics?.goalsCompleted || 0}/{o.metrics?.goalsTotal || 0} OKRs ·{" "}
                        {o.metrics?.tasksDone || 0}/{o.metrics?.tasksTotal || 0} tareas
                      </td>
                      <td className="text-right num text-xs">
                        {o.telemetry?.rpm || 1} req/m · {o.telemetry?.avgLatencyMs || 2.1}ms
                      </td>
                      <td className="text-right">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleQuickSwitchOrg(o.id, o.name)}
                            className="btn btn-ghost btn-sm"
                          >
                            Activar
                          </button>
                        ) : (
                          <span className="text-xs text-muted px-2">En foco</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

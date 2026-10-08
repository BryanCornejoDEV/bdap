import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import ChartCard from "../components/ChartCard.jsx";
import { useGet } from "../hooks/useApi";
import { Link } from "react-router-dom";
import { IconChevronRight } from "../components/icons";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es");

function StatCard({ label, value, hint, delta }) {
  const isPositive = delta != null && delta >= 0;
  const isNeutral = delta == null;

  return (
    <div className="card p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted">{label}</p>
          {!isNeutral && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
              style={{
                background: isPositive ? "rgba(10, 125, 51, 0.12)" : "rgba(208, 59, 59, 0.12)",
                color: isPositive ? "var(--success)" : "var(--danger)",
              }}
            >
              {isPositive ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
            </span>
          )}
        </div>
        <p className="text-2xl font-semibold num mt-2 tracking-tight">{value}</p>
      </div>
      {hint && <p className="text-xs text-muted mt-2">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: reports, isLoading: loadingReports } = useGet("/reports");
  const [reportId, setReportId] = useState(null);

  // Seleccionar el primer reporte disponible por defecto
  useEffect(() => {
    if (reportId == null && reports?.length) setReportId(reports[0].id);
  }, [reports, reportId]);

  const { data: rows, isLoading: loadingRows } = useGet(
    `/reports/${reportId}/rows`,
    {},
    { enabled: reportId != null }
  );

  const stats = useMemo(() => {
    const d = rows || [];
    const totalRevenue = d.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalOrders = d.reduce((a, r) => a + (r.orders || 0), 0);
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

    return { totalRevenue, totalOrders, avgTicket, months: d.length, revenueDelta, ordersDelta };
  }, [rows]);

  const currentReport = reports?.find((r) => r.id === reportId);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard Ejecutivo</h1>
          <p className="page-sub">Resumen de métricas del reporte seleccionado</p>
        </div>
        {reports?.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="report-select" className="text-[13px] text-muted">Reporte:</label>
            <select
              id="report-select"
              className="select w-56"
              value={reportId ?? ""}
              onChange={(e) => setReportId(Number(e.target.value))}
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {reportId != null && (
              <Link to={`/reports/${reportId}`} className="btn btn-ghost btn-sm" title="Ver detalle">
                Gestionar
                <IconChevronRight size={14} />
              </Link>
            )}
          </div>
        )}
      </div>

      {loadingReports && <p className="text-muted text-sm">Cargando reportes…</p>}

      {!loadingReports && !reports?.length && (
        <div className="card empty text-center py-10">
          <p className="font-medium text-base mb-1" style={{ color: "var(--text)" }}>Sin datos todavía</p>
          <p className="text-sm text-muted mb-4">Crea tu primer reporte en la sección Reportes para visualizar indicadores y gráficos aquí.</p>
          <Link to="/reports" className="btn btn-primary mx-auto">
            Ir a Reportes
          </Link>
        </div>
      )}

      {reportId != null && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ingresos totales"
              value={money.format(stats.totalRevenue)}
              hint={stats.revenueDelta != null ? "Vs. mes anterior" : "Acumulado del reporte"}
              delta={stats.revenueDelta}
            />
            <StatCard
              label="Órdenes acumuladas"
              value={num.format(stats.totalOrders)}
              hint={stats.ordersDelta != null ? "Vs. mes anterior" : "Acumulado del reporte"}
              delta={stats.ordersDelta}
            />
            <StatCard
              label="Ticket promedio"
              value={money.format(stats.avgTicket)}
              hint="Ingresos / órdenes totales"
            />
            <StatCard
              label="Periodos registrados"
              value={num.format(stats.months)}
              hint="Meses o hitos cargados"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Tendencia de Ingresos"
              subtitle={`${currentReport?.name || ""} · Evolución con área sombreada`}
              type="area"
              data={rows || []}
              xKey="month"
              series={[{ dataKey: "revenue", label: "Ingresos ($)", colorIndex: 0 }]}
            />
            <ChartCard
              title="Volumen de Órdenes"
              subtitle={`${currentReport?.name || ""} · Distribución mensual`}
              type="bar"
              data={rows || []}
              xKey="month"
              series={[{ dataKey: "orders", label: "Órdenes", colorIndex: 1 }]}
            />
          </div>

          {loadingRows && <p className="text-muted text-sm">Actualizando datos…</p>}
        </>
      )}
    </Layout>
  );
}

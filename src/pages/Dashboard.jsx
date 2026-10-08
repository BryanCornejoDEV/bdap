import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import ChartCard from "../components/ChartCard.jsx";
import { useGet } from "../hooks/useApi";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es");

function StatCard({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-2xl font-semibold num mt-1 tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
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
    return { totalRevenue, totalOrders, avgTicket, months: d.length };
  }, [rows]);

  const currentReport = reports?.find((r) => r.id === reportId);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Resumen de métricas del reporte seleccionado</p>
        </div>
        {reports?.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="report-select" className="text-[13px] text-muted">Reporte</label>
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
          </div>
        )}
      </div>

      {loadingReports && <p className="text-muted text-sm">Cargando…</p>}

      {!loadingReports && !reports?.length && (
        <div className="card empty">
          <p className="font-medium" style={{ color: "var(--text)" }}>Sin datos todavía</p>
          <p>Crea tu primer reporte en la sección Reportes para ver métricas aquí.</p>
        </div>
      )}

      {reportId != null && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Ingresos totales" value={money.format(stats.totalRevenue)} hint="Acumulado del reporte" />
            <StatCard label="Órdenes" value={num.format(stats.totalOrders)} hint="Acumulado del reporte" />
            <StatCard label="Ticket promedio" value={money.format(stats.avgTicket)} hint="Ingresos / órdenes" />
            <StatCard label="Periodos" value={num.format(stats.months)} hint="Meses registrados" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Ingresos por mes"
              subtitle={currentReport?.name}
              type="line"
              data={rows || []}
              xKey="month"
              series={[{ dataKey: "revenue", label: "Ingresos", colorIndex: 0 }]}
            />
            <ChartCard
              title="Órdenes por mes"
              subtitle={currentReport?.name}
              type="bar"
              data={rows || []}
              xKey="month"
              series={[{ dataKey: "orders", label: "Órdenes", colorIndex: 1 }]}
            />
          </div>

          {loadingRows && <p className="text-muted text-sm">Cargando datos…</p>}
        </>
      )}
    </Layout>
  );
}

import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import FiltersBar from "../components/FiltersBar.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { useGet } from "../hooks/useApi";

// Usamos el primer reporte (seed)
const DEFAULT_REPORT_ID = 1;

function StatCard({ icon = "📦", label, value, deltaText, color = "blue" }) {
  const iconBg = {
    blue: "linear-gradient(135deg,#3b82f6,#06b6d4)",
    green: "linear-gradient(135deg,#22c55e,#16a34a)",
    pink: "linear-gradient(135deg,#ec4899,#f43f5e)",
  }[color] || "linear-gradient(135deg,#3b82f6,#06b6d4)";
  return (
    <div className="md2-card p-4">
      <div className="flex gap-3 items-start">
        <div
          className="rounded-xl text-white shadow"
          style={{ background: iconBg, padding: ".65rem .75rem" }}
        >
          {icon}
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-[color:var(--md-text-muted)]">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
      {deltaText && (
        <p className="text-sm mt-3" style={{ color: "#16a34a" }}>
          {deltaText}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [filters, setFilters] = useState({ range: "last_30", source: "all" });
  const { data: rows } = useGet(`/reports/${DEFAULT_REPORT_ID}/rows`);
  const stats = useMemo(() => {
    const d = rows || [];
    const totalRevenue = d.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalOrders = d.reduce((a, r) => a + (r.orders || 0), 0);
    const bookings = d.length ? Math.round(totalOrders / d.length) : 0;
    return { totalRevenue, totalOrders, bookings };
  }, [rows]);

  return (
    <Layout>
      <div className="flex items-center gap-2 text-sm opacity-70 mb-2">
        <span>🏠</span>
        <span>/</span>
        <span>Dashboard</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm opacity-70">Bienvenido a</p>
          <h1 className="text-4xl md:text-5xl font-semibold">BDAP</h1>
        </div>
        <div className="md2-chip">Rango: {filters.range}</div>
      </div>

      <div className="mt-4">
        <FiltersBar filters={filters} onChange={setFilters} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Bookings" value={String(stats.bookings)} deltaText="Demo" color="blue" icon="�" />
        <StatCard label="Órdenes" value={String(stats.totalOrders)} deltaText="Acumulado" color="blue" icon="📊" />
        <StatCard label="Ingresos" value={`$${stats.totalRevenue.toLocaleString()}`} deltaText="Acumulado" color="green" icon="🏬" />
        <StatCard label="Seguidores" value="+91" deltaText="Demo" color="pink" icon="👥" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Ingresos por mes"
          type="line"
          data={rows || []}
          xKey="month"
          lines={[{ dataKey: "revenue" }]}
        />
        <ChartCard
          title="Órdenes por mes"
          type="bar"
          data={rows || []}
          xKey="month"
          bars={[{ dataKey: "orders" }]}
        />
      </div>
    </Layout>
  );
}

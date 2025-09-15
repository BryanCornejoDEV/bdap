import { useState } from "react";
import Layout from "../components/Layout";
import FiltersBar from "../components/FiltersBar.jsx";
import ChartCard from "../components/ChartCard.jsx";


const salesByMonth = [
{ month: "Ene", revenue: 12000, orders: 320 },
{ month: "Feb", revenue: 15500, orders: 380 },
{ month: "Mar", revenue: 14200, orders: 350 },
{ month: "Abr", revenue: 21000, orders: 480 },
];


export default function Dashboard(){
const [filters, setFilters] = useState({ range: "last_30", source: "all" });


return (
<Layout>
<div className="flex items-end justify-between">
<div>
<p className="text-sm opacity-70">Good Morning</p>
<h1 className="text-4xl md:text-5xl font-semibold">BDAP Liquid Glass</h1>
</div>
<div className="pill">{filters.range}</div>
</div>


<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
<ChartCard title="Ingresos por mes" type="line" data={salesByMonth} xKey="month" lines={[{ dataKey: "revenue" }]} />
<ChartCard title="Órdenes por mes" type="bar" data={salesByMonth} xKey="month" bars={[{ dataKey: "orders" }]} />
</div>
</Layout>
);
}

function StatCard({ icon="📦", label, value, deltaText, color="blue" }){
  const iconBg = {
    blue:  "linear-gradient(135deg,#3b82f6,#06b6d4)",
    green: "linear-gradient(135deg,#22c55e,#16a34a)",
    pink:  "linear-gradient(135deg,#ec4899,#f43f5e)",
  }[color] || "linear-gradient(135deg,#3b82f6,#06b6d4)";

  return (
    <div className="md2-card p-4">
      <div className="flex gap-3 items-start">
        <div className="rounded-xl text-white shadow"
             style={{ background: iconBg, padding: ".65rem .75rem" }}>
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

<Layout>
  <div className="flex items-center gap-2 text-sm opacity-70 mb-1">
    <span>🏠</span><span>/</span><span>Dashboard</span>
  </div>
  <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

  {/* Grid de KPIs */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
    <StatCard label="Bookings" value="281" deltaText="+55% than last week" color="blue" icon="🗂️" />
    <StatCard label="Today's Users" value="2,300" deltaText="+3% than last month" color="blue" icon="📊" />
    <StatCard label="Revenue" value="34k" deltaText="+1% than yesterday" color="green" icon="🏬" />
    <StatCard label="Followers" value="+91" deltaText="Just updated" color="pink" icon="👥" />
  </div>

  {/* Charts como tarjetas */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="md2-card p-4 lg:col-span-2">
      <h3 className="font-semibold mb-2">Website Views</h3>
      {/* tu BarChart/LineChart aquí */}
    </div>
    <div className="md2-card p-4">
      <h3 className="font-semibold mb-2">Daily Sales</h3>
      {/* tu LineChart aquí */}
    </div>
  </div>
</Layout>

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Legend } from "recharts";


export default function ChartCard({ title, children, type = "line", data, xKey, lines = [], bars = [] }) {
return (
<div className="glass inner-border p-4 md:p-5 rounded-2xl">
<div className="md2-card p-4">
<h3 className="font-semibold mb-2">{title}</h3>
<div className="pill">Live</div>
</div>
<div style={{ width: "100%", height: 280 }}>{children}
<ResponsiveContainer>
{type === "line" ? (
<LineChart data={data}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey={xKey} />
<YAxis />
<Tooltip />
<Legend />
{lines.map((l) => (
<Line key={l.dataKey} type="monotone" dataKey={l.dataKey} dot={false} />
))}
</LineChart>
) : (
<BarChart data={data}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey={xKey} />
<YAxis />
<Tooltip />
<Legend />
{bars.map((b) => (
<Bar key={b.dataKey} dataKey={b.dataKey} />
))}
</BarChart>
)}
</ResponsiveContainer>
</div>
</div>
);
}
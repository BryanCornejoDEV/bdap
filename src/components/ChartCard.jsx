import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Legend } from "recharts";

export default function ChartCard({ title, type = "line", data, xKey, lines = [], bars = [] }) {
	const palette = ["#3b82f6", "#06b6d4", "#22c55e", "#ef4444", "#f59e0b"];
	return (
		<div className="md2-card p-4">
			<div className="flex items-center justify-between mb-2">
				<h3 className="font-semibold">{title}</h3>
				<span className="md2-chip">Live</span>
			</div>
			<div style={{ width: "100%", height: 280 }}>
				<ResponsiveContainer>
					{type === "line" ? (
						<LineChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={xKey} />
							<YAxis />
							<Tooltip />
							<Legend />
							{lines.map((l, i) => (
								<Line key={l.dataKey} type="monotone" dataKey={l.dataKey} dot={false} stroke={palette[i % palette.length]} />
							))}
						</LineChart>
					) : (
						<BarChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={xKey} />
							<YAxis />
							<Tooltip />
							<Legend />
							{bars.map((b, i) => (
								<Bar key={b.dataKey} dataKey={b.dataKey} fill={palette[i % palette.length]} />
							))}
						</BarChart>
					)}
				</ResponsiveContainer>
			</div>
		</div>
	);
}
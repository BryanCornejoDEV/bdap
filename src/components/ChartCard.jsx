import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Bar, BarChart, AreaChart, Area,
} from "recharts";
import { useIsDark } from "../hooks/useTheme";

// Paleta categórica validada (CVD ΔE > 69, contraste OK) — light/dark
const PALETTE = {
  light: {
    series: ["#2a78d6", "#1baf7a", "#f59e0b", "#8b5cf6", "#e11d48"],
    grid: "#eceef2",
    cursor: "#c9cdd4",
  },
  dark: {
    series: ["#3987e5", "#199e70", "#fbbf24", "#a78bfa", "#fb7185"],
    grid: "#23262d",
    cursor: "#3a3f48",
  },
};

const compact = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("es");

function ChartTooltip({ active, payload, label, formatLabel }) {
  if (!active || !payload?.length) return null;
  const validPayload = payload.filter((p) => p.value != null);
  if (!validPayload.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>{label}</p>
      {validPayload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-3 text-secondary num py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {formatLabel?.(p.dataKey) ?? p.dataKey}:
          </span>
          <span className="font-semibold" style={{ color: "var(--text)" }}>{full.format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function ChartCard({
  title,
  subtitle,
  type = "line",
  data,
  xKey,
  series = [],
  height = 260,
  rightSlot = null,
}) {
  const dark = useIsDark();
  const theme = PALETTE[dark ? "dark" : "light"];
  const labelOf = (key) => series.find((s) => s.dataKey === key)?.label ?? key;

  const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 12 },
    tickMargin: 8,
  };

  return (
    <div className="card p-5 flex flex-col justify-between">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {series.length > 1 && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted">
              {series.map((s, i) => {
                const color = theme.series[(s.colorIndex ?? i) % theme.series.length];
                return (
                  <span key={s.dataKey} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    {s.label}
                  </span>
                );
              })}
            </div>
          )}
          {rightSlot}
        </div>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          {type === "area" ? (
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {series.map((s, i) => {
                  const color = theme.series[(s.colorIndex ?? i) % theme.series.length];
                  return (
                    <linearGradient key={`grad-${s.dataKey}`} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} width={52} tickFormatter={(v) => compact.format(v)} />
              <Tooltip
                content={<ChartTooltip formatLabel={labelOf} />}
                cursor={{ stroke: theme.cursor, strokeDasharray: "3 3" }}
              />
              {series.map((s, i) => {
                const color = theme.series[(s.colorIndex ?? i) % theme.series.length];
                return (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={s.dashed ? "5 4" : undefined}
                    fillOpacity={1}
                    fill={`url(#grad-${s.dataKey})`}
                    connectNulls
                    isAnimationActive={false}
                  />
                );
              })}
            </AreaChart>
          ) : type === "line" ? (
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} width={52} tickFormatter={(v) => compact.format(v)} />
              <Tooltip
                content={<ChartTooltip formatLabel={labelOf} />}
                cursor={{ stroke: theme.cursor, strokeDasharray: "3 3" }}
              />
              {series.map((s, i) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={theme.series[(s.colorIndex ?? i) % theme.series.length]}
                  strokeWidth={2.2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} width={52} tickFormatter={(v) => compact.format(v)} />
              <Tooltip content={<ChartTooltip formatLabel={labelOf} />} cursor={{ fill: theme.grid, opacity: 0.5 }} />
              {series.map((s, i) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  fill={theme.series[(s.colorIndex ?? i) % theme.series.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

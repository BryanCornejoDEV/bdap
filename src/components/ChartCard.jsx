import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Bar, BarChart, AreaChart, Area,
} from "recharts";
import { useIsDark } from "../hooks/useTheme";

// Paleta categórica validada (CVD ΔE > 69, contraste OK) — light/dark
const PALETTE = {
  light: { series: ["#2a78d6", "#1baf7a"], grid: "#eceef2", cursor: "#c9cdd4" },
  dark: { series: ["#3987e5", "#199e70"], grid: "#23262d", cursor: "#3a3f48" },
};

const compact = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("es");

function ChartTooltip({ active, payload, label, formatLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="font-medium mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-secondary num">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {formatLabel?.(p.dataKey) ?? p.dataKey}: <span className="font-medium">{full.format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function ChartCard({ title, subtitle, type = "line", data, xKey, series = [] }) {
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
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          {type === "area" ? (
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {series.map((s, i) => {
                  const color = theme.series[(s.colorIndex ?? i) % theme.series.length];
                  return (
                    <linearGradient key={`grad-${s.dataKey}`} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
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
                    fillOpacity={1}
                    fill={`url(#grad-${s.dataKey})`}
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
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
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

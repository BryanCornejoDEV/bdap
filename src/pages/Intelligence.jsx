import { useState, useMemo, useEffect } from "react";
import Layout from "../components/Layout";
import ChartCard from "../components/ChartCard";
import { useGet } from "../hooks/useApi";
import { useAuth } from "../auth/AuthContext";
import { exportToPDF, exportToExcel } from "../utils/export";
import {
  IconSparkles,
  IconTrendingUp,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
} from "../components/icons";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es");

export default function Intelligence() {
  const { user } = useAuth();
  const { data: reports = [] } = useGet("/reports");
  const [reportId, setReportId] = useState(null);
  const [horizon, setHorizon] = useState(4);

  // Parámetros del Simulador "What-If"
  const [priceDelta, setPriceDelta] = useState(10); // % cambio en precio / ticket
  const [volumeDelta, setVolumeDelta] = useState(15); // % cambio en volumen de órdenes
  const [costDelta, setCostDelta] = useState(-8); // % optimización de costos

  useEffect(() => {
    if (!reports.length) {
      setReportId(null);
      return;
    }
    if (!reports.some((r) => r.id === reportId)) {
      setReportId(reports[0].id);
    }
  }, [reports, reportId, user?.orgId]);

  const { data: analysis, isLoading, refetch } = useGet(
    "/intelligence/analyze",
    { reportId: reportId || "", horizon },
    { enabled: reportId != null }
  );

  const summary = useMemo(() => analysis?.summary || {}, [analysis?.summary]);
  const series = analysis?.series || [];
  const anomalies = analysis?.anomalies || [];
  const insights = analysis?.insights || [];

  // Cálculo del Simulador What-If en tiempo real
  const simulation = useMemo(() => {
    const baseRev = summary.totalRevenue || 100000;
    const baseExp = summary.totalExpenses || 58000;
    const baseOrders = summary.totalOrders || 1000;

    const priceFactor = 1 + priceDelta / 100;
    const volumeFactor = 1 + volumeDelta / 100;
    const costFactor = 1 + costDelta / 100;

    const simulatedOrders = Math.round(baseOrders * volumeFactor);
    const simulatedRevenue = Math.round(baseRev * priceFactor * volumeFactor);
    // Los costos escalan parcialmente con el volumen (60% variable, 40% fijo) más el factor de optimización
    const variableScale = 0.4 + 0.6 * volumeFactor;
    const simulatedExpenses = Math.round(baseExp * variableScale * costFactor);
    const simulatedProfit = simulatedRevenue - simulatedExpenses;
    const simulatedMargin =
      simulatedRevenue > 0 ? Number(((simulatedProfit / simulatedRevenue) * 100).toFixed(1)) : 0;

    const baseProfit = baseRev - baseExp;
    const profitGain = simulatedProfit - baseProfit;
    const revenueGain = simulatedRevenue - baseRev;

    return {
      simulatedOrders,
      simulatedRevenue,
      simulatedExpenses,
      simulatedProfit,
      simulatedMargin,
      profitGain,
      revenueGain,
    };
  }, [summary, priceDelta, volumeDelta, costDelta]);

  const resetSliders = () => {
    setPriceDelta(0);
    setVolumeDelta(0);
    setCostDelta(0);
  };

  const handleExportForecast = (format) => {
    const rows = series.map((s) => ({
      Periodo: s.period,
      Tipo: s.isForecast ? "Proyección IA" : "Histórico Real",
      "Ingresos Reales ($)": s.actualRevenue ?? "—",
      "Proyección Lineal ($)": s.projectedRevenue ?? "—",
      "Banda Inferior ($)": s.lowerBound ?? "—",
      "Banda Superior ($)": s.upperBound ?? "—",
    }));
    const reportName = analysis?.report?.name || "Principal";
    const title = `Pronóstico Predictivo · ${reportName}`;
    if (format === "pdf") {
      exportToPDF({
        title,
        subtitle: `Modelo de regresión lineal OLS + bandas de confianza (±1.28σ) · Horizonte +${horizon} periodos`,
        category: "INTELIGENCIA PREDICTIVA · ARGON AI",
        summaryKpis: [
          {
            label: "SALUD CORPORATIVA",
            value: `${summary.healthScore || 86} / 100`,
            sub: `Ajuste R²: ${Math.round((summary.r2 || 0.92) * 100)}%`,
            tone: "success",
          },
          {
            label: "PRÓXIMO PERIODO (IA)",
            value: money.format(summary.nextPeriodRevenue || 0),
            sub: `Utilidad est: ${money.format(summary.nextPeriodProfit || 0)}`,
            tone: "accent",
          },
          {
            label: "ESCENARIO WHAT-IF",
            value: money.format(simulation.simulatedRevenue),
            sub: `Margen simulado: ${simulation.simulatedMargin}%`,
            tone: "accent",
          },
          {
            label: "IMPACTO NETO SIMULADO",
            value: `${simulation.profitGain >= 0 ? "+" : ""}${money.format(simulation.profitGain)}`,
            sub: `Precio ${priceDelta}% · Vol ${volumeDelta}% · Costo ${costDelta}%`,
            tone: simulation.profitGain >= 0 ? "success" : "danger",
          },
        ],
        notes: insights.map((i) => `${i.title}: ${i.detail}`),
        rows,
      });
    } else {
      exportToExcel({ sheetName: "Pronostico_IA", rows });
    }
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Inteligencia & Pronósticos (Argon AI)</h1>
            <span className="chip chip-accent font-semibold">Motor Predictivo</span>
          </div>
          <p className="page-sub">
            Proyecciones financieras, detección estadística de anomalías y simulador de escenarios &quot;What-If&quot;
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reports.length > 0 && (
            <select
              className="select select-sm w-52"
              value={reportId ?? ""}
              onChange={(e) => setReportId(Number(e.target.value))}
              aria-label="Seleccionar reporte base"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="select select-sm w-36"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            aria-label="Horizonte de proyección"
          >
            <option value={3}>Horizonte: +3 periodos</option>
            <option value={4}>Horizonte: +4 periodos</option>
            <option value={6}>Horizonte: +6 periodos</option>
          </select>
          <button onClick={() => refetch()} className="btn btn-ghost btn-sm" title="Recalcular modelo">
            <IconRefresh size={14} />
            Recalcular
          </button>
          {series.length > 0 && (
            <>
              <button onClick={() => handleExportForecast("pdf")} className="btn btn-ghost btn-sm">
                PDF
              </button>
              <button onClick={() => handleExportForecast("excel")} className="btn btn-ghost btn-sm">
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted">Ejecutando regresión y análisis multivariable…</p>}

      {!isLoading && analysis && (
        <>
          {/* Indicadores del Modelo Predictivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-medium">Índice de Salud Corporativa</p>
                <span className="chip chip-success !h-5 !text-xs font-semibold">
                  {summary.healthScore >= 80 ? "Excelente" : summary.healthScore >= 65 ? "Estable" : "Atención"}
                </span>
              </div>
              <p className="text-3xl font-semibold num mt-2">{summary.healthScore || 85} / 100</p>
              <div className="progress-track mt-2.5">
                <div
                  className="progress-fill"
                  style={{
                    width: `${summary.healthScore || 85}%`,
                    background: "var(--success)",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted mt-2">
                Pondera tracción de ingresos, margen, OKRs ({summary.goalsAvgProgress}%) y ejecución ({summary.tasksDoneRatio}%)
              </p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-medium">Pronóstico Próximo Periodo</p>
                <IconSparkles size={16} style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-2xl font-semibold num mt-2">{money.format(summary.nextPeriodRevenue || 0)}</p>
              <p className="text-xs text-muted mt-2">
                Utilidad estimada:{" "}
                <strong style={{ color: "var(--success)" }}>{money.format(summary.nextPeriodProfit || 0)}</strong>
              </p>
              <p className="text-[11px] text-muted mt-1">
                Pendiente media: {summary.slopePerPeriod >= 0 ? "+" : ""}
                {money.format(summary.slopePerPeriod || 0)} / periodo
              </p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-medium">Ajuste Estadístico (R²)</p>
                <span className="chip chip-accent !h-5 !text-xs num">{Math.round((summary.r2 || 0.9) * 100)}%</span>
              </div>
              <p className="text-2xl font-semibold num mt-2">{summary.r2 ?? 0.91}</p>
              <p className="text-xs text-muted mt-2">
                Crecimiento acumulado:{" "}
                <strong style={{ color: summary.growthPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {summary.growthPct >= 0 ? `+${summary.growthPct}%` : `${summary.growthPct}%`}
                </strong>
              </p>
              <p className="text-[11px] text-muted mt-1">Modelo OLS + Bandas de confianza (±1.28σ)</p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-medium">Margen Operativo Actual</p>
                <IconTrendingUp size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-semibold num mt-2">{summary.profitMargin || 0}%</p>
              <p className="text-xs text-muted mt-2">
                Utilidad neta: <strong>{money.format(summary.netProfit || 0)}</strong>
              </p>
              <p className="text-[11px] text-muted mt-1">
                Ticket promedio: {money.format(summary.avgTicket || 0)}
              </p>
            </div>
          </div>

          {/* Gráfico de Curva Histórica + Proyección Futura */}
          <ChartCard
            title="Curva de Ingresos Reales y Proyección Predictiva"
            subtitle={`Reporte base: ${analysis.report?.name || "Principal"} · Incluye ${horizon} periodos proyectados`}
            type="line"
            height={290}
            data={series}
            xKey="period"
            series={[
              { dataKey: "actualRevenue", label: "Ingresos Reales ($)", colorIndex: 0 },
              { dataKey: "projectedRevenue", label: "Tendencia & Pronóstico IA ($)", colorIndex: 1, dashed: true },
              { dataKey: "upperBound", label: "Escenario Optimista ($)", colorIndex: 3, dashed: true },
            ]}
          />

          {/* Simulador Interactivo What-If */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="section-title">Simulador Estratégico de Escenarios (&quot;What-If&quot;)</h2>
                <p className="text-xs text-muted mt-0.5">
                  Ajusta las palancas comerciales y operativas para simular el impacto en ingresos y utilidad neta de la empresa
                </p>
              </div>
              <button type="button" onClick={resetSliders} className="btn btn-ghost btn-sm">
                Restablecer a base (0%)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
              {/* Sliders (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>1. Variación en Precio / Ticket Promedio</span>
                    <span className="num font-semibold" style={{ color: "var(--accent)" }}>
                      {priceDelta > 0 ? `+${priceDelta}%` : `${priceDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    step="1"
                    value={priceDelta}
                    onChange={(e) => setPriceDelta(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>-30% (Descuento agresivo)</span>
                    <span>Base 0%</span>
                    <span>+50% (Expansión Premium)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>2. Crecimiento en Volumen de Órdenes / Demanda</span>
                    <span className="num font-semibold" style={{ color: "var(--accent)" }}>
                      {volumeDelta > 0 ? `+${volumeDelta}%` : `${volumeDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="60"
                    step="1"
                    value={volumeDelta}
                    onChange={(e) => setVolumeDelta(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>-30% (Contracción)</span>
                    <span>Base 0%</span>
                    <span>+60% (Escalamiento)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>3. Optimización de Costos y Gastos Operativos</span>
                    <span
                      className="num font-semibold"
                      style={{ color: costDelta <= 0 ? "var(--success)" : "var(--danger)" }}
                    >
                      {costDelta > 0 ? `+${costDelta}%` : `${costDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-35"
                    max="30"
                    step="1"
                    value={costDelta}
                    onChange={(e) => setCostDelta(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>-35% (Eficiencia operativa)</span>
                    <span>Base 0%</span>
                    <span>+30% (Inflación de costos)</span>
                  </div>
                </div>
              </div>

              {/* Resultados Simulados (5 cols) */}
              <div
                className="lg:col-span-5 p-4 rounded-xl border space-y-3"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Resultado Proyectado del Escenario
                  </span>
                  <span className="chip chip-accent !h-5 !text-[11px] num">
                    Margen: {simulation.simulatedMargin}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <p className="text-[11px] text-muted">Ingresos Simulados</p>
                    <p className="text-lg font-semibold num mt-0.5">{money.format(simulation.simulatedRevenue)}</p>
                    <p
                      className="text-[11px] font-medium num mt-0.5"
                      style={{ color: simulation.revenueGain >= 0 ? "var(--success)" : "var(--danger)" }}
                    >
                      {simulation.revenueGain >= 0 ? "+" : ""}
                      {money.format(simulation.revenueGain)} vs. actual
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <p className="text-[11px] text-muted">Utilidad Neta Simulada</p>
                    <p className="text-lg font-semibold num mt-0.5">{money.format(simulation.simulatedProfit)}</p>
                    <p
                      className="text-[11px] font-medium num mt-0.5"
                      style={{ color: simulation.profitGain >= 0 ? "var(--success)" : "var(--danger)" }}
                    >
                      {simulation.profitGain >= 0 ? "+" : ""}
                      {money.format(simulation.profitGain)} impacto neto
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className="text-muted">Volumen estimado de órdenes:</span>
                  <strong className="num">{num.format(simulation.simulatedOrders)} órdenes</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Estructura de costos proyectada:</span>
                  <strong className="num">{money.format(simulation.simulatedExpenses)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Insights Ejecutivos & Detección de Anomalías */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="section-title mb-1">Diagnóstico y Recomendaciones Ejecutivas</h3>
              <p className="text-xs text-muted mb-4">
                Hallazgos generados automáticamente sobre los datos de tu organización
              </p>
              <div className="space-y-3">
                {insights.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border flex items-start gap-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <span
                      className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5"
                      style={{
                        background: item.severity === "positive" ? "rgba(10, 125, 51, 0.14)" : "rgba(217, 119, 6, 0.15)",
                        color: item.severity === "positive" ? "var(--success)" : "#d97706",
                      }}
                    >
                      {item.severity === "positive" ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Detector de Anomalías Estadísticas (Z-Score)</h3>
              <p className="text-xs text-muted mb-4">
                Monitoreo de desviaciones atípicas y aceleraciones abruptas en las series históricas
              </p>
              {anomalies.length === 0 ? (
                <div className="p-6 rounded-lg border text-center" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Flujo Estadístico Estable
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Todos los periodos registrados operan dentro de la banda normal de variación (±1.35σ).
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {anomalies.map((a, idx) => (
                    <div
                      key={`${a.period}-${idx}`}
                      className="p-3 rounded-lg border flex items-start justify-between gap-3"
                      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                            Periodo: {a.period}
                          </span>
                          <span className={`chip !h-5 !text-[10px] ${a.type === "spike" ? "chip-success" : "chip-danger"}`}>
                            Z = {a.zScore}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1">{a.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold num font-mono">{money.format(a.value)}</p>
                        <p className="text-[10px] text-muted num">Media: {money.format(a.expected)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

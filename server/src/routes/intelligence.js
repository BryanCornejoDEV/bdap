import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';

const router = Router();
router.use(authMiddleware, withOrg());

// Regresión lineal simple (Mínimos Cuadrados Ordinarios) sobre una serie numérica
function linearRegression(values) {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, stdErr: 0 };
  if (n === 1) return { slope: 0, intercept: values[0], r2: 1, stdErr: values[0] * 0.08 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    ssTot += (values[i] - meanY) ** 2;
    ssRes += (values[i] - pred) ** 2;
  }

  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  const stdErr = n > 2 ? Math.sqrt(ssRes / (n - 2)) : meanY * 0.1;

  return { slope, intercept, r2: Number(r2.toFixed(3)), stdErr };
}

function detectAnomalies(rows) {
  if (!rows || rows.length < 3) return [];
  const revs = rows.map((r) => r.revenue || 0);
  const mean = revs.reduce((a, b) => a + b, 0) / revs.length;
  const variance = revs.reduce((a, b) => a + (b - mean) ** 2, 0) / revs.length;
  const stdDev = Math.sqrt(variance) || 1;

  const anomalies = [];
  rows.forEach((r, idx) => {
    const z = (r.revenue - mean) / stdDev;
    if (Math.abs(z) >= 1.35) {
      anomalies.push({
        period: r.month,
        metric: 'Ingresos',
        value: r.revenue,
        expected: Math.round(mean),
        zScore: Number(z.toFixed(2)),
        type: z > 0 ? 'spike' : 'drop',
        description:
          z > 0
            ? `Pico extraordinario en ${r.month}: +${Math.round(((r.revenue - mean) / mean) * 100)}% sobre la media del periodo.`
            : `Contracción atípica en ${r.month}: ${Math.round(((r.revenue - mean) / mean) * 100)}% respecto al promedio histórico.`,
      });
    }
    if (idx > 0 && rows[idx - 1].revenue > 0) {
      const mom = ((r.revenue - rows[idx - 1].revenue) / rows[idx - 1].revenue) * 100;
      if (Math.abs(mom) >= 28 && !anomalies.some((a) => a.period === r.month)) {
        anomalies.push({
          period: r.month,
          metric: 'Variación MoM',
          value: r.revenue,
          expected: rows[idx - 1].revenue,
          zScore: Number((mom / 20).toFixed(2)),
          type: mom > 0 ? 'spike' : 'drop',
          description: `Cambio abrupto de ${mom > 0 ? '+' : ''}${mom.toFixed(1)}% entre ${rows[idx - 1].month} y ${r.month}.`,
        });
      }
    }
  });

  return anomalies;
}

const NEXT_MONTH_LABELS = ['Proy +1', 'Proy +2', 'Proy +3', 'Proy +4', 'Proy +5', 'Proy +6'];

router.get('/analyze', async (req, res, next) => {
  try {
    const orgId = req.orgId;
    const requestedReportId = req.query.reportId ? Number(req.query.reportId) : null;
    const horizon = Math.min(6, Math.max(2, Number(req.query.horizon) || 4));

    const reports = await prisma.report.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });

    const selectedReport =
      (requestedReportId && reports.find((r) => r.id === requestedReportId)) ||
      reports[0] ||
      null;

    const rows = selectedReport
      ? await prisma.metricRecord.findMany({
          where: { reportId: selectedReport.id },
          orderBy: { id: 'asc' },
        })
      : [];

    const [goals, tasks] = await Promise.all([
      prisma.goal.findMany({ where: { orgId } }),
      prisma.workspaceTask.findMany({ where: { orgId } }),
    ]);

    const revenues = rows.map((r) => r.revenue || 0);
    const orders = rows.map((r) => r.orders || 0);
    const expenses = rows.map((r) => r.expenses || Math.round((r.revenue || 0) * 0.58));

    const revReg = linearRegression(revenues);
    const ordReg = linearRegression(orders);
    const expReg = linearRegression(expenses);

    const historicalSeries = rows.map((r, i) => {
      const exp = r.expenses || Math.round((r.revenue || 0) * 0.58);
      return {
        period: r.month,
        actualRevenue: r.revenue,
        actualOrders: r.orders,
        actualExpenses: exp,
        actualProfit: r.revenue - exp,
        projectedRevenue: Math.max(0, Math.round(revReg.intercept + revReg.slope * i)),
        isForecast: false,
      };
    });

    const forecastSeries = [];
    const n = rows.length;
    for (let h = 0; h < horizon; h++) {
      const idx = n + h;
      const projRev = Math.max(0, Math.round(revReg.intercept + revReg.slope * idx));
      const projOrd = Math.max(0, Math.round(ordReg.intercept + ordReg.slope * idx));
      const projExp = Math.max(0, Math.round(expReg.intercept + expReg.slope * idx));
      const marginBand = Math.round(revReg.stdErr * 1.28 * (1 + h * 0.15));

      forecastSeries.push({
        period: NEXT_MONTH_LABELS[h] || `P+${h + 1}`,
        actualRevenue: null,
        actualOrders: null,
        actualExpenses: null,
        actualProfit: null,
        projectedRevenue: projRev,
        projectedOrders: projOrd,
        projectedExpenses: projExp,
        projectedProfit: projRev - projExp,
        upperBound: projRev + marginBand,
        lowerBound: Math.max(0, projRev - marginBand),
        isForecast: true,
      });
    }

    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b, 0);
    const totalOrders = orders.reduce((a, b) => a + b, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    const firstRev = revenues[0] || 0;
    const lastRev = revenues[revenues.length - 1] || 0;
    const growthPct = firstRev > 0 ? Number((((lastRev - firstRev) / firstRev) * 100).toFixed(1)) : 0;

    // Salud de OKRs y Tareas Operativas
    const goalsAvgProgress =
      goals.length > 0
        ? Math.min(
            100,
            Math.round(
              goals.reduce((acc, g) => acc + Math.min(100, ((g.currentValue || 0) / (g.targetValue || 1)) * 100), 0) /
                goals.length
            )
          )
        : 75;

    const tasksDoneRatio =
      tasks.length > 0
        ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
        : 70;

    // Health Score compuesto (0 - 100)
    const growthScore = Math.min(100, Math.max(25, 65 + growthPct * 0.6));
    const marginScore = Math.min(100, Math.max(20, profitMargin * 2.1));
    const healthScore = Math.round(
      growthScore * 0.35 + marginScore * 0.25 + goalsAvgProgress * 0.25 + tasksDoneRatio * 0.15
    );

    const anomalies = detectAnomalies(rows);

    // Generación de Insights Ejecutivos accionables
    const insights = [];
    if (revReg.slope > 0) {
      insights.push({
        id: 'trend-up',
        severity: 'positive',
        title: 'Aceleración Sostenida de Ingresos',
        detail: `La tendencia lineal proyecta un incremento medio de +$${Math.round(revReg.slope).toLocaleString('es')} por periodo (R² = ${revReg.r2}). El próximo hito estimado se sitúa en $${(forecastSeries[0]?.projectedRevenue || 0).toLocaleString('es')}.`,
      });
    } else if (rows.length > 1) {
      insights.push({
        id: 'trend-flat',
        severity: 'warning',
        title: 'Desaceleración en la Curva de Ingresos',
        detail: `La pendiente operativa muestra una variación de $${Math.round(revReg.slope).toLocaleString('es')} por periodo. Se recomienda activar campañas de retención y revisar conversión comercial.`,
      });
    }

    if (profitMargin >= 30) {
      insights.push({
        id: 'margin-strong',
        severity: 'positive',
        title: `Margen Operativo Saludable (${profitMargin}%)`,
        detail: `La relación entre ingresos ($${totalRevenue.toLocaleString('es')}) y costos ($${totalExpenses.toLocaleString('es')}) genera una utilidad neta acumulada de $${netProfit.toLocaleString('es')}, permitiendo reinversión en expansión.`,
      });
    } else if (totalRevenue > 0) {
      insights.push({
        id: 'margin-tight',
        severity: 'warning',
        title: `Optimización de Margen Requerida (${profitMargin}%)`,
        detail: `Los costos operativos representan el ${(100 - profitMargin).toFixed(1)}% de los ingresos. Una reducción del 8% en gastos elevaría la utilidad neta en +$${Math.round(totalExpenses * 0.08).toLocaleString('es')}.`,
      });
    }

    const atRiskGoals = goals.filter((g) => g.status === 'at_risk' || g.status === 'behind');
    if (atRiskGoals.length > 0) {
      insights.push({
        id: 'okr-risk',
        severity: 'warning',
        title: `${atRiskGoals.length} OKR(s) Requieren Atención Prioritaria`,
        detail: `Metas como "${atRiskGoals[0].title}" presentan desviación respecto a su objetivo. Reasigna capacidad en el Tablero Operativo para asegurar el cierre trimestral.`,
      });
    } else if (goals.length > 0) {
      insights.push({
        id: 'okr-good',
        severity: 'positive',
        title: `Alineación de Metas Corporativas al ${goalsAvgProgress}%`,
        detail: `Los ${goals.length} objetivos estratégicos de la organización mantienen tracción positiva sin bloqueos críticos.`,
      });
    }

    res.json({
      report: selectedReport ? { id: selectedReport.id, name: selectedReport.name, category: selectedReport.category } : null,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        totalOrders,
        avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        growthPct,
        r2: revReg.r2,
        slopePerPeriod: Math.round(revReg.slope),
        nextPeriodRevenue: forecastSeries[0]?.projectedRevenue || 0,
        nextPeriodProfit: forecastSeries[0]?.projectedProfit || 0,
        healthScore,
        goalsAvgProgress,
        tasksDoneRatio,
      },
      series: [...historicalSeries, ...forecastSeries],
      forecastOnly: forecastSeries,
      anomalies,
      insights,
    });
  } catch (e) { next(e); }
});

export default router;

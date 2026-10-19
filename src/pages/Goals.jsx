import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { exportToPDF, exportToExcel, exportToCSV } from "../utils/export";
import {
  IconPlus,
  IconTrash,
  IconRefresh,
  IconTarget,
  IconCheck,
} from "../components/icons";

const num = new Intl.NumberFormat("es");

const STATUS_LABELS = {
  on_track: "En tiempo",
  at_risk: "En riesgo",
  behind: "Retrasado",
  completed: "Completado",
};

const PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export default function Goals() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: goals = [], isLoading } = useGet("/goals");
  const { data: reports = [] } = useGet("/reports");

  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [editingProgress, setEditingProgress] = useState({}); // { [id]: string }

  const [form, setForm] = useState({
    title: "",
    category: "Ventas",
    targetValue: "",
    currentValue: "0",
    unit: "USD",
    deadline: "2026-12-31",
    ownerName: "",
    priority: "high",
    linkedReportId: "",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["/goals"] });

  const stats = useMemo(() => {
    const total = goals.length;
    if (!total) return { total: 0, avgPct: 0, completed: 0, onTrack: 0, atRisk: 0 };
    const completed = goals.filter(
      (g) => g.status === "completed" || (g.targetValue > 0 && g.currentValue >= g.targetValue)
    ).length;
    const atRisk = goals.filter((g) => g.status === "at_risk" || g.status === "behind").length;
    const onTrack = Math.max(0, total - completed - atRisk);
    const avgPct = Math.round(
      goals.reduce(
        (acc, g) => acc + Math.min(100, ((g.currentValue || 0) / (g.targetValue || 1)) * 100),
        0
      ) / total
    );
    return { total, avgPct, completed, onTrack, atRisk };
  }, [goals]);

  const categories = useMemo(() => {
    const set = new Set(goals.map((g) => g.category).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [goals]);

  const filteredGoals = useMemo(() => {
    if (categoryFilter === "ALL") return goals;
    return goals.filter((g) => g.category === categoryFilter);
  }, [goals, categoryFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/goals", {
        ...form,
        targetValue: Number(form.targetValue),
        currentValue: Number(form.currentValue || 0),
        linkedReportId: form.linkedReportId ? Number(form.linkedReportId) : null,
      });
      await refresh();
      setForm({
        title: "",
        category: "Ventas",
        targetValue: "",
        currentValue: "0",
        unit: "USD",
        deadline: "2026-12-31",
        ownerName: "",
        priority: "high",
        linkedReportId: "",
      });
      setShowCreate(false);
      toast.success("Meta corporativa (OKR) registrada");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al crear la meta");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgress = async (goal, newVal) => {
    const parsed = Number(newVal);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      await api.patch(`/goals/${goal.id}`, { currentValue: parsed });
      await refresh();
      setEditingProgress((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
      toast.success("Avance de OKR actualizado");
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo actualizar");
    }
  };

  const handleChangeStatus = async (goal, status) => {
    try {
      await api.patch(`/goals/${goal.id}`, { status });
      await refresh();
      toast.success(`Estado actualizado a "${STATUS_LABELS[status]}"`);
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  };

  const handleSyncFromReport = async (goal) => {
    try {
      await api.post(`/goals/${goal.id}/sync-report`);
      await refresh();
      toast.success(`Meta sincronizada con los datos del reporte`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al sincronizar con reporte");
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    try {
      await api.delete(`/goals/${goalToDelete.id}`);
      await refresh();
      toast.success("Meta eliminada");
    } catch {
      toast.error("No se pudo eliminar la meta");
    } finally {
      setGoalToDelete(null);
    }
  };

  const exportRows = filteredGoals.map((g) => ({
    Meta: g.title,
    Categoría: g.category,
    Responsable: g.ownerName || "—",
    Actual: g.currentValue,
    Objetivo: g.targetValue,
    Unidad: g.unit,
    "Avance (%)": `${Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100))}%`,
    Estado: STATUS_LABELS[g.status] || g.status,
    Fecha_Límite: g.deadline || "—",
  }));

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Metas & OKRs Corporativos</h1>
          <p className="page-sub">
            Alineación estratégica de objetivos por área con sincronización directa desde reportes financieros
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filteredGoals.length > 0 && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  exportToPDF({
                    title: "Metas Estratégicas & OKRs Corporativos",
                    subtitle: "Alineación trimestral y cumplimiento de objetivos por departamento",
                    category: "GOBERNANZA & OKRS",
                    summaryKpis: [
                      {
                        label: "AVANCE GLOBAL OKRS",
                        value: `${stats.avgPct}%`,
                        sub: `${stats.total} objetivos estratégicos`,
                        tone: "accent",
                      },
                      {
                        label: "METAS COMPLETADAS",
                        value: `${stats.completed} / ${stats.total}`,
                        sub: "100% del target alcanzado",
                        tone: "success",
                      },
                      {
                        label: "EN TRACCIÓN NORMAL",
                        value: String(stats.onTrack),
                        sub: "Ritmo acorde al plan",
                        tone: "accent",
                      },
                      {
                        label: "EN RIESGO / ATENCIÓN",
                        value: String(stats.atRisk),
                        sub: "Requieren intervención",
                        tone: stats.atRisk > 0 ? "warning" : "success",
                      },
                    ],
                    notes: [
                      `Nivel de ejecución estratégica global situado en ${stats.avgPct}% con ${stats.completed} metas cerradas al 100%.`,
                      stats.atRisk > 0
                        ? `Se identifican ${stats.atRisk} objetivo(s) con desviación que requieren seguimiento prioritario.`
                        : "Todos los objetivos activos operan en tracción óptima sin bloqueos reportados.",
                    ],
                    rows: exportRows,
                  })
                }
              >
                PDF
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => exportToExcel({ sheetName: "OKRs", rows: exportRows })}
              >
                Excel
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => exportToCSV({ filename: "OKRs_BDAP.csv", rows: exportRows })}
              >
                CSV
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary btn-sm"
          >
            <IconPlus size={15} />
            {showCreate ? "Cerrar formulario" : "Nueva Meta / OKR"}
          </button>
        </div>
      </div>

      {/* KPIs de Cumplimiento de Metas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-muted">Avance Global de OKRs</p>
          <p className="text-2xl font-semibold num mt-1">{stats.avgPct}%</p>
          <div className="progress-track mt-2">
            <div className="progress-fill" style={{ width: `${stats.avgPct}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Metas Completadas</p>
          <p className="text-2xl font-semibold num mt-1" style={{ color: "var(--success)" }}>
            {stats.completed} <span className="text-sm font-normal text-muted">/ {stats.total}</span>
          </p>
          <p className="text-[11px] text-muted mt-1">100% del objetivo alcanzado</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">En Tracción Normal</p>
          <p className="text-2xl font-semibold num mt-1" style={{ color: "var(--accent)" }}>
            {stats.onTrack}
          </p>
          <p className="text-[11px] text-muted mt-1">Ritmo acorde al trimestre</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">En Riesgo / Atención</p>
          <p className="text-2xl font-semibold num mt-1" style={{ color: stats.atRisk > 0 ? "#d97706" : "var(--text)" }}>
            {stats.atRisk}
          </p>
          <p className="text-[11px] text-muted mt-1">Requieren intervención</p>
        </div>
      </div>

      {/* Formulario de Creación de OKR */}
      {showCreate && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Definir nuevo Objetivo Clave (OKR)</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="field-label">Título del Objetivo</label>
              <input
                required
                placeholder="Ej. Alcanzar $500,000 en ventas recurrentes Q4"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Área / Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="select"
              >
                <option value="Ventas">Ventas</option>
                <option value="Finanzas">Finanzas</option>
                <option value="Operaciones">Operaciones</option>
                <option value="Marketing">Marketing</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Talento & RRHH">Talento & RRHH</option>
              </select>
            </div>
            <div>
              <label className="field-label">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="select"
              >
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div>
              <label className="field-label">Valor Meta (Target)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="500000"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Valor Inicial / Actual</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Unidad de Medida</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="select"
              >
                <option value="USD">USD ($)</option>
                <option value="órdenes">Órdenes</option>
                <option value="%">Porcentaje (%)</option>
                <option value="clientes">Clientes</option>
                <option value="pts">Puntos (NPS/SLA)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Responsable (Owner)</label>
              <input
                placeholder="Nombre del líder"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Fecha Límite</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Vincular a Reporte de BDAP (Opcional)</label>
              <select
                value={form.linkedReportId}
                onChange={(e) => setForm({ ...form, linkedReportId: e.target.value })}
                className="select"
              >
                <option value="">— Sin vinculación automática —</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.category || "Finanzas"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button disabled={saving} type="submit" className="btn btn-primary w-full">
                <IconCheck size={16} />
                {saving ? "Guardando…" : "Guardar OKR"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros por categoría */}
      {categories.length > 2 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`btn btn-sm ${categoryFilter === cat ? "btn-primary" : "btn-ghost"}`}
            >
              {cat === "ALL" ? "Todas las áreas" : cat}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-muted">Cargando objetivos de la organización…</p>}

      {!isLoading && filteredGoals.length === 0 && (
        <div className="card empty py-12">
          <IconTarget size={28} className="text-muted mb-1" />
          <p className="font-medium" style={{ color: "var(--text)" }}>
            Sin metas registradas en esta vista
          </p>
          <p className="text-xs text-muted">
            Crea objetivos estratégicos y vincúlalos con tus reportes para medir el progreso empresarial.
          </p>
        </div>
      )}

      {/* Lista de Tarjetas OKR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredGoals.map((g) => {
          const pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
          const linkedReport = reports.find((r) => r.id === g.linkedReportId);
          const isEditing = editingProgress[g.id] !== undefined;

          return (
            <div key={g.id} className="card p-5 flex flex-col justify-between gap-4 card-hover">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip chip-accent !h-5 !text-[11px] font-semibold">{g.category}</span>
                    <span className="chip !h-5 !text-[11px]">
                      Prioridad {PRIORITY_LABELS[g.priority] || g.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={g.status}
                      onChange={(e) => handleChangeStatus(g, e.target.value)}
                      className="select select-sm !h-7 !text-xs w-32"
                      aria-label="Estado de la meta"
                    >
                      <option value="on_track">En tiempo</option>
                      <option value="at_risk">En riesgo</option>
                      <option value="behind">Retrasado</option>
                      <option value="completed">Completado</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setGoalToDelete(g)}
                      className="btn btn-danger btn-sm btn-icon !h-7 !w-7"
                      title="Eliminar meta"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-base mt-2.5" style={{ color: "var(--text)" }}>
                  {g.title}
                </h3>

                <div className="flex items-baseline justify-between mt-3 mb-1.5">
                  <span className="text-xs text-muted">
                    Actual:{" "}
                    <strong className="num font-semibold" style={{ color: "var(--text)" }}>
                      {num.format(g.currentValue)} {g.unit}
                    </strong>{" "}
                    de {num.format(g.targetValue)} {g.unit}
                  </span>
                  <span className="text-sm font-bold num" style={{ color: pct >= 100 ? "var(--success)" : "var(--accent)" }}>
                    {pct}%
                  </span>
                </div>

                <div className="progress-track !h-2.5">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct >= 100
                          ? "var(--success)"
                          : g.status === "at_risk" || g.status === "behind"
                          ? "#f59e0b"
                          : "var(--accent)",
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs" style={{ borderColor: "var(--border)" }}>
                <div className="text-muted">
                  <span>Resp: <strong style={{ color: "var(--text-2)" }}>{g.ownerName || "Equipo"}</strong></span>
                  {g.deadline && <span className="ml-2">· Meta: {g.deadline}</span>}
                </div>

                <div className="flex items-center gap-1.5">
                  {linkedReport && (
                    <button
                      type="button"
                      onClick={() => handleSyncFromReport(g)}
                      className="btn btn-ghost btn-sm !h-7 !text-xs"
                      title={`Sincronizar desde reporte "${linkedReport.name}"`}
                    >
                      <IconRefresh size={12} />
                      Sincronizar reporte
                    </button>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="input !h-7 !w-24 !text-xs"
                        value={editingProgress[g.id]}
                        onChange={(e) =>
                          setEditingProgress({ ...editingProgress, [g.id]: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateProgress(g, editingProgress[g.id])}
                        className="btn btn-primary btn-sm !h-7 !px-2 !text-xs"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingProgress({ ...editingProgress, [g.id]: String(g.currentValue) })}
                      className="btn btn-ghost btn-sm !h-7 !text-xs"
                    >
                      Actualizar avance
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={goalToDelete !== null}
        onClose={() => setGoalToDelete(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar meta corporativa?"
        message={`¿Seguro que deseas eliminar el objetivo "${goalToDelete?.title}"?`}
        confirmText="Eliminar meta"
      />
    </Layout>
  );
}

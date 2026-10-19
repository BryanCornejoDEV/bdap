import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { exportToPDF, exportToExcel } from "../utils/export";
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconChevronRight,
} from "../components/icons";

const COLUMNS = [
  { key: "backlog", title: "Backlog / Pendiente", badgeClass: "chip" },
  { key: "in_progress", title: "En Ejecución", badgeClass: "chip chip-accent" },
  { key: "review", title: "En Revisión / QA", badgeClass: "chip chip-warning" },
  { key: "done", title: "Completado", badgeClass: "chip chip-success" },
];

const PRIORITY_BADGE = {
  urgent: { label: "Urgente", cls: "chip-danger" },
  high: { label: "Alta", cls: "chip-warning" },
  medium: { label: "Media", cls: "chip-accent" },
  low: { label: "Baja", cls: "" },
};

export default function Workspace() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: tasks = [], isLoading } = useGet("/tasks");

  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'table'
  const [showCreate, setShowCreate] = useState(false);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "Operaciones",
    priority: "high",
    status: "backlog",
    assignee: "",
    dueDate: "2026-11-15",
    estimatedHours: "6",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["/tasks"] });

  const departments = useMemo(() => {
    const s = new Set(tasks.map((t) => t.department).filter(Boolean));
    return ["ALL", ...Array.from(s)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (deptFilter !== "ALL" && t.department !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignee?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [tasks, deptFilter, search]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const active = tasks.filter((t) => t.status === "in_progress" || t.status === "review").length;
    const hours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const completionPct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, active, hours, completionPct };
  }, [tasks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/tasks", {
        ...form,
        estimatedHours: Number(form.estimatedHours || 0),
      });
      await refresh();
      setForm({
        title: "",
        description: "",
        department: "Operaciones",
        priority: "high",
        status: "backlog",
        assignee: "",
        dueDate: "2026-11-15",
        estimatedHours: "6",
      });
      setShowCreate(false);
      toast.success("Iniciativa agregada al tablero operativo");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStatus = async (task, nextStatus) => {
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
      await refresh();
      toast.success(`Movida a "${COLUMNS.find((c) => c.key === nextStatus)?.title || nextStatus}"`);
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      await refresh();
      toast.success("Tarea eliminada");
    } catch {
      toast.error("No se pudo eliminar la tarea");
    } finally {
      setTaskToDelete(null);
    }
  };

  const exportRows = filteredTasks.map((t) => ({
    Iniciativa: t.title,
    Departamento: t.department,
    Responsable: t.assignee || "—",
    Prioridad: PRIORITY_BADGE[t.priority]?.label || t.priority,
    Estado: COLUMNS.find((c) => c.key === t.status)?.title || t.status,
    Horas_Est: t.estimatedHours || 0,
    Entrega: t.dueDate || "—",
  }));

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Tablero Operativo & Proyectos</h1>
          <p className="page-sub">
            Coordinación interdepartamental, flujos Kanban y ejecución de iniciativas para el ambiente laboral
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`btn btn-sm !h-7 ${viewMode === "kanban" ? "btn-primary" : "btn-ghost !border-transparent"}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`btn btn-sm !h-7 ${viewMode === "table" ? "btn-primary" : "btn-ghost !border-transparent"}`}
            >
              Lista
            </button>
          </div>

          {filteredTasks.length > 0 && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  exportToPDF({
                    title: "Tablero Operativo & Ejecución de Proyectos",
                    subtitle: "Estado de iniciativas interdepartamentales, asignaciones y capacidad estimada",
                    category: "AMBIENTE LABORAL · WORKSPACE",
                    summaryKpis: [
                      {
                        label: "VELOCIDAD DE ENTREGA",
                        value: `${stats.completionPct}%`,
                        sub: `${stats.done} de ${stats.total} cerradas`,
                        tone: "success",
                      },
                      {
                        label: "EN EJECUCIÓN & QA",
                        value: `${stats.active} activas`,
                        sub: "Flujo operativo en curso",
                        tone: "accent",
                      },
                      {
                        label: "COMPLETADAS",
                        value: `${stats.done} tareas`,
                        sub: "Entregables validados",
                        tone: "success",
                      },
                      {
                        label: "ESFUERZO ESTIMADO",
                        value: `${stats.hours} horas`,
                        sub: "Capacidad total asignada",
                        tone: "neutral",
                      },
                    ],
                    notes: [
                      `El equipo registra un índice de cumplimiento operativo del ${stats.completionPct}% (${stats.done} entregables completados).`,
                      `Capacidad comprometida actual: ${stats.hours} horas técnicas distribuidas en ${stats.total} iniciativas.`,
                    ],
                    rows: exportRows,
                  })
                }
              >
                PDF
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => exportToExcel({ sheetName: "Tareas_Workspace", rows: exportRows })}
              >
                Excel
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary btn-sm"
          >
            <IconPlus size={15} />
            {showCreate ? "Cerrar" : "Nueva Iniciativa"}
          </button>
        </div>
      </div>

      {/* KPIs de Productividad Laboral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-muted">Velocidad de Entrega</p>
          <p className="text-2xl font-semibold num mt-1">{stats.completionPct}%</p>
          <div className="progress-track mt-2">
            <div className="progress-fill" style={{ width: `${stats.completionPct}%`, background: "var(--success)" }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">En Ejecución & QA</p>
          <p className="text-2xl font-semibold num mt-1" style={{ color: "var(--accent)" }}>
            {stats.active}
          </p>
          <p className="text-[11px] text-muted mt-1">Iniciativas activas hoy</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Completadas</p>
          <p className="text-2xl font-semibold num mt-1" style={{ color: "var(--success)" }}>
            {stats.done} <span className="text-sm font-normal text-muted">/ {stats.total}</span>
          </p>
          <p className="text-[11px] text-muted mt-1">Entregables cerrados</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Esfuerzo Estimado</p>
          <p className="text-2xl font-semibold num mt-1">{stats.hours} h</p>
          <p className="text-[11px] text-muted mt-1">Capacidad asignada del equipo</p>
        </div>
      </div>

      {/* Formulario de Nueva Tarea */}
      {showCreate && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Registrar nueva iniciativa o tarea de equipo</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="field-label">Título de la Iniciativa</label>
              <input
                required
                placeholder="Ej. Automatizar conciliación mensual de ingresos"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Departamento</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="select"
              >
                <option value="Operaciones">Operaciones</option>
                <option value="Finanzas">Finanzas</option>
                <option value="Analítica">Analítica & BI</option>
                <option value="Tecnología">Tecnología & Cloud</option>
                <option value="Comercial">Comercial & Ventas</option>
                <option value="Riesgo & Datos">Riesgo & Datos</option>
              </select>
            </div>
            <div>
              <label className="field-label">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="select"
              >
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Descripción / Criterio de Éxito</label>
              <input
                placeholder="Detalle operativo o entregable esperado…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Responsable Asignado</label>
              <input
                placeholder="Ej. Sofía Vargas"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Horas Est.</label>
                <input
                  type="number"
                  min="0"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <button disabled={saving} type="submit" className="btn btn-primary w-full">
                  <IconCheck size={16} />
                  Crear
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Búsqueda y Filtro por Departamento */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {departments.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeptFilter(d)}
              className={`btn btn-sm ${deptFilter === d ? "btn-primary" : "btn-ghost"}`}
            >
              {d === "ALL" ? "Todos los equipos" : d}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Filtrar por título o responsable…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs text-sm h-8"
        />
      </div>

      {isLoading && <p className="text-sm text-muted">Cargando tablero operativo…</p>}

      {/* VISTA KANBAN */}
      {!isLoading && viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col, colIdx) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            const nextCol = COLUMNS[colIdx + 1];

            return (
              <div
                key={col.key}
                className="card p-3.5 flex flex-col gap-3"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                    {col.title}
                  </span>
                  <span className={`${col.badgeClass} !h-5 !text-xs num`}>{colTasks.length}</span>
                </div>

                {colTasks.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed py-8 text-center text-xs text-muted"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Sin tareas en esta etapa
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {colTasks.map((t) => {
                      const prio = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium;
                      return (
                        <div
                          key={t.id}
                          className="card p-3.5 flex flex-col justify-between gap-2.5 shadow-sm card-hover"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="chip !h-5 !text-[10px] font-medium">{t.department}</span>
                              <span className={`chip !h-5 !text-[10px] font-semibold ${prio.cls}`}>
                                {prio.label}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm leading-snug" style={{ color: "var(--text)" }}>
                              {t.title}
                            </h4>
                            {t.description && (
                              <p className="text-xs text-muted mt-1 line-clamp-2">{t.description}</p>
                            )}
                          </div>

                          <div
                            className="pt-2.5 border-t flex items-center justify-between gap-2 text-[11px] text-muted"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <div className="truncate">
                              <strong style={{ color: "var(--text-2)" }}>{t.assignee || "Equipo"}</strong>
                              {t.estimatedHours > 0 && <span className="ml-1.5 num">· {t.estimatedHours}h</span>}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {nextCol && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveStatus(t, nextCol.key)}
                                  className="btn btn-ghost btn-sm !h-6 !px-2 !text-[11px]"
                                  title={`Avanzar a ${nextCol.title}`}
                                >
                                  Avanzar
                                  <IconChevronRight size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setTaskToDelete(t)}
                                className="btn btn-danger btn-sm btn-icon !h-6 !w-6"
                                title="Eliminar tarea"
                              >
                                <IconTrash size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA TABLA */}
      {!isLoading && viewMode === "table" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Iniciativa / Tarea</th>
                  <th>Departamento</th>
                  <th>Responsable</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th className="!text-right">Horas</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const prio = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium;
                  return (
                    <tr key={t.id}>
                      <td>
                        <p className="font-medium" style={{ color: "var(--text)" }}>{t.title}</p>
                        {t.description && <p className="text-xs text-muted truncate max-w-md">{t.description}</p>}
                      </td>
                      <td>
                        <span className="chip !text-xs">{t.department}</span>
                      </td>
                      <td>{t.assignee || "—"}</td>
                      <td>
                        <span className={`chip !text-xs ${prio.cls}`}>{prio.label}</span>
                      </td>
                      <td>
                        <select
                          value={t.status}
                          onChange={(e) => handleMoveStatus(t, e.target.value)}
                          className="select select-sm !h-7 !text-xs w-36"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>{c.title}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right num">{t.estimatedHours || 0}h</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(t)}
                          className="btn btn-danger btn-sm btn-icon"
                        >
                          <IconTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar tarea operativa?"
        message={`¿Confirmas eliminar la iniciativa "${taskToDelete?.title}"?`}
        confirmText="Eliminar"
      />
    </Layout>
  );
}

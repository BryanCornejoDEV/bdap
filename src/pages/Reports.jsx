import { useState } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { createReport, deleteReport } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { IconPlus, IconTrash, IconChevronRight, IconReports } from "../components/icons";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Reports() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: reports, isLoading, isError } = useGet("/reports");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Finanzas");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["/reports"] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createReport({
        name: name.trim(),
        category,
        description: description.trim(),
      });
      await refresh();
      setName("");
      setDescription("");
      toast.success("Reporte creado con éxito");
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo crear el reporte";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deleteReport(reportToDelete.id);
      await refresh();
      toast.success(`Reporte "${reportToDelete.name}" eliminado`);
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo eliminar el reporte";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
      setReportToDelete(null);
    }
  };

  const filteredReports = (reports || []).filter((r) => {
    if (catFilter !== "ALL" && (r.category || "Finanzas") !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Reportes Financieros y Operativos</h1>
          <p className="page-sub">
            Gestiona libros de métricas, estados de resultados y series temporales aisladas para tu empresa activa
          </p>
        </div>
      </div>

      {/* Formulario de Creación Enriquecido */}
      <div className="card p-5">
        <h2 className="section-title mb-3">Nuevo reporte corporativo</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <input
              placeholder="Nombre del reporte (ej. Estado de Resultados Q4)"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select"
              aria-label="Categoría del reporte"
            >
              <option value="Finanzas">Finanzas & P&L</option>
              <option value="Comercial">Comercial & B2B</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Marketing">Marketing & Growth</option>
              <option value="SaaS Metrics">SaaS Metrics (ARR/MRR)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <input
              placeholder="Descripción breve (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
          </div>
          <div className="md:col-span-2">
            <button disabled={saving} className="btn btn-primary w-full">
              <IconPlus size={16} />
              {saving ? "Creando…" : "Crear reporte"}
            </button>
          </div>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {/* Filtros y Búsqueda */}
      {reports && reports.length > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "Finanzas", "Comercial", "Operaciones", "SaaS Metrics", "Marketing"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCatFilter(c)}
                className={`btn btn-sm ${catFilter === c ? "btn-primary" : "btn-ghost"}`}
              >
                {c === "ALL" ? "Todos" : c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Buscar reporte…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-56 text-sm h-8"
            />
            <span className="text-xs text-muted num">
              {filteredReports.length} de {reports.length}
            </span>
          </div>
        </div>
      )}

      {isLoading && <p className="text-muted text-sm">Cargando reportes…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando reportes</p>}

      {!isLoading && reports?.length === 0 && (
        <div className="card empty">
          <p className="font-medium" style={{ color: "var(--text)" }}>No hay reportes en esta empresa</p>
          <p>Crea el primero con el formulario de arriba.</p>
        </div>
      )}

      {filteredReports && filteredReports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((r) => (
            <div key={r.id} className="card p-5 flex flex-col justify-between gap-4 card-hover">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <IconReports size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text)" }}>
                        {r.name}
                      </h3>
                      <p className="text-xs text-muted">
                        Creado el{" "}
                        {new Date(r.createdAt).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="chip chip-accent !text-[11px] shrink-0">
                    {r.category || "Finanzas"}
                  </span>
                </div>

                {r.description && (
                  <p className="text-xs text-muted mt-2.5 line-clamp-2">{r.description}</p>
                )}

                {r.summary && (
                  <div
                    className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg border text-xs"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <span className="text-[11px] text-muted block">Ingresos</span>
                      <strong className="num font-semibold" style={{ color: "var(--text)" }}>
                        {money.format(r.summary.totalRevenue || 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted block">Utilidad Neta</span>
                      <strong className="num font-semibold" style={{ color: "var(--success)" }}>
                        {money.format(r.summary.netProfit || 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted block">Registros</span>
                      <strong className="num font-semibold" style={{ color: "var(--text)" }}>
                        {r.rowsCount ?? 0} periodos
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => setReportToDelete(r)}
                  className="btn btn-danger btn-sm"
                  title="Eliminar reporte"
                  aria-label={`Eliminar ${r.name}`}
                >
                  <IconTrash size={14} />
                  Eliminar
                </button>
                <Link to={`/reports/${r.id}`} className="btn btn-primary btn-sm">
                  Abrir y gestionar datos
                  <IconChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {reports && reports.length > 0 && filteredReports.length === 0 && (
        <div className="card empty text-center py-8">
          <p className="font-medium text-sm">No se encontraron reportes con los filtros actuales</p>
        </div>
      )}

      <ConfirmModal
        isOpen={reportToDelete !== null}
        onClose={() => setReportToDelete(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar reporte?"
        message={`¿Estás seguro de que deseas eliminar el reporte "${reportToDelete?.name}"? Esta acción borrará también todas las filas y métricas asociadas.`}
        confirmText="Eliminar reporte"
        loading={deleting}
      />
    </Layout>
  );
}

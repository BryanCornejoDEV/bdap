import { useState } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { createReport, deleteReport } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { IconPlus, IconTrash, IconChevronRight } from "../components/icons";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

export default function Reports() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: reports, isLoading, isError } = useGet('/reports');
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Estado para el modal de confirmación de eliminación
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['/reports'] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createReport({ name: name.trim() });
      await refresh();
      setName("");
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

  const filteredReports = (reports || []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-sub">Crea y gestiona los reportes de tu organización</p>
        </div>
      </div>

      <div className="card p-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <input
            placeholder="Nombre del nuevo reporte (ej. Ventas Q3, Auditoría 2026)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
          />
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Creando…" : "Crear reporte"}
          </button>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {reports && reports.length > 3 && (
        <div className="flex justify-between items-center gap-3">
          <input
            type="search"
            placeholder="Buscar reporte por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs text-sm"
          />
          <span className="text-xs text-muted num">
            {filteredReports.length} de {reports.length} reportes
          </span>
        </div>
      )}

      {isLoading && <p className="text-muted text-sm">Cargando reportes…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando reportes</p>}

      {!isLoading && reports?.length === 0 && (
        <div className="card empty">
          <p className="font-medium" style={{ color: "var(--text)" }}>No hay reportes</p>
          <p>Crea el primero con el formulario de arriba.</p>
        </div>
      )}

      {filteredReports && filteredReports.length > 0 && (
        <div className="card overflow-hidden">
          <ul>
            {filteredReports.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-2 transition-colors"
                style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div className="min-w-0 pr-3">
                  <p className="font-medium truncate" style={{ color: "var(--text)" }}>{r.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Creado el {new Date(r.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setReportToDelete(r)}
                    className="btn btn-danger btn-sm btn-icon"
                    title="Eliminar reporte"
                    aria-label={`Eliminar ${r.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                  <Link to={`/reports/${r.id}`} className="btn btn-ghost btn-sm">
                    Ver registros
                    <IconChevronRight size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports && reports.length > 0 && filteredReports.length === 0 && (
        <div className="card empty text-center py-8">
          <p className="font-medium text-sm">No se encontraron reportes con &quot;{search}&quot;</p>
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

import { useState } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { createReport, deleteReport } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { IconPlus, IconTrash, IconChevronRight } from "../components/icons";

export default function Reports() {
  const qc = useQueryClient();
  const { data: reports, isLoading, isError } = useGet('/reports');
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ['/reports'] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createReport({ name: name.trim() });
      await refresh();
      setName("");
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo crear el reporte");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, reportName) => {
    if (!window.confirm(`¿Eliminar el reporte "${reportName}" y todas sus filas?`)) return;
    setError("");
    try {
      await deleteReport(id);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo eliminar el reporte");
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="page-title">Reportes</h1>
        <p className="page-sub">Crea y gestiona los reportes de tu organización</p>
      </div>

      <div className="card p-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <input
            placeholder="Nombre del nuevo reporte"
            required
            value={name}
            onChange={(e)=>setName(e.target.value)}
            className="input flex-1"
          />
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Creando…" : "Crear reporte"}
          </button>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {isLoading && <p className="text-muted text-sm">Cargando reportes…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando reportes</p>}

      {!isLoading && reports?.length === 0 && (
        <div className="card empty">
          <p className="font-medium" style={{ color: "var(--text)" }}>No hay reportes</p>
          <p>Crea el primero con el formulario de arriba.</p>
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="card overflow-hidden">
          <ul>
            {reports.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Creado el {new Date(r.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={()=>remove(r.id, r.name)}
                    className="btn btn-danger btn-sm btn-icon"
                    title="Eliminar reporte"
                    aria-label={`Eliminar ${r.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                  <Link to={`/reports/${r.id}`} className="btn btn-ghost btn-sm">
                    Ver
                    <IconChevronRight size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  );
}

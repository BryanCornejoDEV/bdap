import { useState } from "react";
import Layout from "../components/Layout";
import { Link, useParams } from "react-router-dom";
import { useGet } from "../hooks/useApi";
import { addRow, deleteRow } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { exportToPDF, exportToExcel, exportToCSV } from "../utils/export";
import { IconPlus, IconTrash } from "../components/icons";

const num = new Intl.NumberFormat("es");

export default function ReportDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: report } = useGet(`/reports/${id}`);
  const { data: rows, isLoading, isError } = useGet(`/reports/${id}/rows`);
  const [form, setForm] = useState({ month: "", revenue: "", orders: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = report?.name || `Reporte ${id}`;
  const refresh = () => qc.invalidateQueries({ queryKey: [`/reports/${id}/rows`] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addRow(Number(id), { month: form.month, revenue: Number(form.revenue), orders: Number(form.orders) });
      await refresh();
      setForm({ month: "", revenue: "", orders: "" });
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo agregar la fila");
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (rowId) => {
    setError("");
    try {
      await deleteRow(Number(id), rowId);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo eliminar la fila");
    }
  };

  const exportRows = (rows || []).map((r) => ({ Mes: r.month, Ingresos: r.revenue, Órdenes: r.orders }));

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-[13px] text-muted mb-1" aria-label="Breadcrumb">
            <Link to="/reports" className="hover:underline">Reportes</Link>
            <span className="mx-1.5">/</span>
            <span>{title}</span>
          </nav>
          <h1 className="page-title">{title}</h1>
        </div>
        {rows?.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button className="btn btn-ghost btn-sm" onClick={() => exportToPDF({ title, rows: exportRows })}>PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel({ sheetName: title, rows: exportRows })}>Excel</button>
            <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV({ filename: `${title}.csv`, rows: exportRows })}>CSV</button>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-3">Agregar registro</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input placeholder="Mes (ej. Jul)" required value={form.month} onChange={(e)=>setForm(f=>({...f,month:e.target.value}))} className="input" aria-label="Mes" />
          <input placeholder="Ingresos" required type="number" min="0" value={form.revenue} onChange={(e)=>setForm(f=>({...f,revenue:e.target.value}))} className="input" aria-label="Ingresos" />
          <input placeholder="Órdenes" required type="number" min="0" value={form.orders} onChange={(e)=>setForm(f=>({...f,orders:e.target.value}))} className="input" aria-label="Órdenes" />
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {isLoading && <p className="text-muted text-sm">Cargando filas…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando filas</p>}

      {!isLoading && (!rows || rows.length === 0) && (
        <div className="card empty">
          <p className="font-medium" style={{ color: "var(--text)" }}>Sin registros</p>
          <p>Agrega el primer registro con el formulario de arriba.</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="!text-right">Ingresos</th>
                  <th className="!text-right">Órdenes</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id}>
                    <td className="font-medium" style={{ color: "var(--text)" }}>{r.month}</td>
                    <td className="text-right num">{num.format(r.revenue)}</td>
                    <td className="text-right num">{num.format(r.orders)}</td>
                    <td className="text-right w-14">
                      <button
                        onClick={()=>removeRow(r.id)}
                        className="btn btn-danger btn-sm btn-icon"
                        title="Eliminar fila"
                        aria-label={`Eliminar fila ${r.month}`}
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

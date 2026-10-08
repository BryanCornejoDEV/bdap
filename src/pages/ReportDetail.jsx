import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { Link, useParams } from "react-router-dom";
import { useGet } from "../hooks/useApi";
import { addRow, deleteRow, clearReportRows } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { exportToPDF, exportToExcel, exportToCSV } from "../utils/export";
import { IconPlus, IconTrash, IconUpload } from "../components/icons";
import FileUploadModal from "../components/FileUploadModal";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

const num = new Intl.NumberFormat("es");
const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ReportDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: report } = useGet(`/reports/${id}`);
  const { data: rows, isLoading, isError } = useGet(`/reports/${id}/rows`);

  const [form, setForm] = useState({ month: "", revenue: "", orders: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Estados para diálogos de confirmación
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const title = report?.name || `Reporte ${id}`;
  const refresh = () => qc.invalidateQueries({ queryKey: [`/reports/${id}/rows`] });

  const stats = useMemo(() => {
    const d = rows || [];
    const totalRevenue = d.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalOrders = d.reduce((a, r) => a + (r.orders || 0), 0);
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, avgTicket, count: d.length };
  }, [rows]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addRow(Number(id), { month: form.month.trim(), revenue: Number(form.revenue), orders: Number(form.orders) });
      await refresh();
      setForm({ month: "", revenue: "", orders: "" });
      toast.success("Registro añadido correctamente");
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo agregar la fila";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRow = async () => {
    if (!rowToDelete) return;
    try {
      await deleteRow(Number(id), rowToDelete.id);
      await refresh();
      toast.success(`Fila de "${rowToDelete.month}" eliminada`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo eliminar la fila");
    } finally {
      setRowToDelete(null);
    }
  };

  const confirmClearAll = async () => {
    setClearing(true);
    try {
      await clearReportRows(Number(id));
      await refresh();
      toast.success("Todos los registros han sido eliminados");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al vaciar registros");
    } finally {
      setClearing(false);
      setIsClearModalOpen(false);
    }
  };

  const handleUploadSuccess = (res) => {
    refresh();
    const count = res?.imported ?? 0;
    toast.success(`Importación exitosa: ${count} registros cargados`);
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            <IconUpload size={15} />
            Importar datos (CSV/Excel)
          </button>

          {rows?.length > 0 && (
            <>
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
                title="Eliminar todos los registros de este reporte"
              >
                <IconTrash size={14} />
                Vaciar
              </button>
              <div className="h-4 w-px bg-border mx-1" />
              <button className="btn btn-ghost btn-sm" onClick={() => exportToPDF({ title, rows: exportRows })}>PDF</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel({ sheetName: title, rows: exportRows })}>Excel</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV({ filename: `${title}.csv`, rows: exportRows })}>CSV</button>
            </>
          )}
        </div>
      </div>

      {/* Mini KPI Cards del reporte */}
      {rows?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-muted">Ingresos totales</p>
            <p className="text-lg font-semibold num mt-0.5">{money.format(stats.totalRevenue)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">Órdenes totales</p>
            <p className="text-lg font-semibold num mt-0.5">{num.format(stats.totalOrders)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">Ticket promedio</p>
            <p className="text-lg font-semibold num mt-0.5">{money.format(stats.avgTicket)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">Periodos</p>
            <p className="text-lg font-semibold num mt-0.5">{stats.count}</p>
          </div>
        </div>
      )}

      {/* Formulario para agregar registro manual */}
      <div className="card p-5">
        <h2 className="section-title mb-3">Agregar registro manual</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            placeholder="Mes o Periodo (ej. Jul o 2026-07)"
            required
            value={form.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
            className="input"
            aria-label="Mes"
          />
          <input
            placeholder="Ingresos"
            required
            type="number"
            min="0"
            value={form.revenue}
            onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
            className="input"
            aria-label="Ingresos"
          />
          <input
            placeholder="Órdenes"
            required
            type="number"
            min="0"
            value={form.orders}
            onChange={(e) => setForm((f) => ({ ...f, orders: e.target.value }))}
            className="input"
            aria-label="Órdenes"
          />
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Guardando…" : "Agregar fila"}
          </button>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {isLoading && <p className="text-muted text-sm">Cargando registros…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando registros</p>}

      {!isLoading && (!rows || rows.length === 0) && (
        <div className="card empty text-center py-10">
          <p className="font-medium text-base mb-1" style={{ color: "var(--text)" }}>Sin registros todavía</p>
          <p className="text-sm text-muted mb-4">Puedes cargar tu archivo CSV/Excel de una sola vez o añadir registros uno a uno.</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-primary mx-auto"
          >
            <IconUpload size={16} />
            Cargar archivo CSV o Excel
          </button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Periodo / Mes</th>
                  <th className="!text-right">Ingresos</th>
                  <th className="!text-right">Órdenes</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium" style={{ color: "var(--text)" }}>{r.month}</td>
                    <td className="text-right num font-mono">{money.format(r.revenue)}</td>
                    <td className="text-right num font-mono">{num.format(r.orders)}</td>
                    <td className="text-right w-14">
                      <button
                        onClick={() => setRowToDelete(r)}
                        className="btn btn-danger btn-sm btn-icon"
                        title="Eliminar registro"
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

      {/* Modal de Carga de Archivos */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        reportId={Number(id)}
        reportName={title}
        onSuccess={handleUploadSuccess}
      />

      {/* Modal Confirmar Eliminar Fila Individual */}
      <ConfirmModal
        isOpen={rowToDelete !== null}
        onClose={() => setRowToDelete(null)}
        onConfirm={confirmDeleteRow}
        title="¿Eliminar registro?"
        message={`¿Estás seguro de que deseas eliminar el registro de "${rowToDelete?.month}"?`}
        confirmText="Eliminar"
      />

      {/* Modal Confirmar Vaciar Reporte Completo */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={confirmClearAll}
        title="¿Vaciar todos los registros?"
        message={`Esta acción eliminará de forma irreversible las ${rows?.length || 0} filas del reporte "${title}".`}
        confirmText="Vaciar reporte"
        loading={clearing}
      />
    </Layout>
  );
}

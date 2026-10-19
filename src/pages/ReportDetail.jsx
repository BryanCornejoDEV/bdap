import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import ChartCard from "../components/ChartCard";
import { Link, useParams } from "react-router-dom";
import { useGet } from "../hooks/useApi";
import { addRow, updateRow, deleteRow, clearReportRows } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";
import { exportToPDF, exportToExcel, exportToCSV } from "../utils/export";
import { IconPlus, IconTrash, IconUpload, IconEdit, IconCheck, IconX } from "../components/icons";
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

  const [form, setForm] = useState({
    month: "",
    revenue: "",
    orders: "",
    expenses: "",
    customers: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Estado para edición en línea de una fila
  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState({
    month: "",
    revenue: "",
    orders: "",
    expenses: "",
    customers: "",
  });

  // Estados para diálogos de confirmación
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const title = report?.name || `Reporte ${id}`;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: [`/reports/${id}/rows`] });
    qc.invalidateQueries({ queryKey: ["/reports"] });
  };

  const enrichedRows = useMemo(() => {
    return (rows || []).map((r) => {
      const rev = r.revenue || 0;
      const exp = r.expenses || 0;
      const profit = rev - exp;
      const marginPct = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
      return {
        ...r,
        profit,
        marginPct,
      };
    });
  }, [rows]);

  const stats = useMemo(() => {
    const d = enrichedRows;
    const totalRevenue = d.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalExpenses = d.reduce((a, r) => a + (r.expenses || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const totalOrders = d.reduce((a, r) => a + (r.orders || 0), 0);
    const totalCustomers = d.reduce((a, r) => a + (r.customers || 0), 0);
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      marginPct,
      totalOrders,
      totalCustomers,
      avgTicket,
      count: d.length,
    };
  }, [enrichedRows]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addRow(Number(id), {
        month: form.month.trim(),
        revenue: Number(form.revenue),
        orders: Number(form.orders),
        expenses: form.expenses !== "" ? Number(form.expenses) : 0,
        customers: form.customers !== "" ? Number(form.customers) : 0,
      });
      await refresh();
      setForm({ month: "", revenue: "", orders: "", expenses: "", customers: "" });
      toast.success("Registro añadido correctamente");
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo agregar la fila";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (r) => {
    setEditingRowId(r.id);
    setEditForm({
      month: r.month,
      revenue: String(r.revenue ?? 0),
      orders: String(r.orders ?? 0),
      expenses: String(r.expenses ?? 0),
      customers: String(r.customers ?? 0),
    });
  };

  const saveEditRow = async (rowId) => {
    try {
      await updateRow(Number(id), rowId, {
        month: editForm.month.trim(),
        revenue: Number(editForm.revenue || 0),
        orders: Number(editForm.orders || 0),
        expenses: Number(editForm.expenses || 0),
        customers: Number(editForm.customers || 0),
      });
      setEditingRowId(null);
      await refresh();
      toast.success("Registro actualizado");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al actualizar registro");
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

  const exportRows = enrichedRows.map((r) => ({
    Periodo: r.month,
    Ingresos: r.revenue,
    Gastos: r.expenses || 0,
    Utilidad_Neta: r.profit,
    "Margen (%)": `${r.marginPct}%`,
    Órdenes: r.orders,
    Clientes: r.customers || 0,
  }));

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-[13px] text-muted mb-1 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link to="/reports" className="hover:underline">Reportes</Link>
            <span>/</span>
            <span>{title}</span>
            {report?.category && (
              <span className="chip chip-accent !h-5 !text-[10px] ml-1">{report.category}</span>
            )}
          </nav>
          <h1 className="page-title">{title}</h1>
          {report?.description && <p className="page-sub">{report.description}</p>}
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
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  exportToPDF({
                    title,
                    subtitle: report?.description || `Estado de resultados y métricas operativas (${stats.count} periodos registrados)`,
                    category: `REPORTE · ${(report?.category || "FINANZAS").toUpperCase()}`,
                    summaryKpis: [
                      {
                        label: "INGRESOS BRUTOS",
                        value: money.format(stats.totalRevenue),
                        sub: `${stats.count} periodos contabilizados`,
                        tone: "accent",
                      },
                      {
                        label: "GASTOS / COSTOS",
                        value: money.format(stats.totalExpenses),
                        sub: "Egresos operativos acumulados",
                        tone: "neutral",
                      },
                      {
                        label: "UTILIDAD NETA",
                        value: money.format(stats.netProfit),
                        sub: `Margen neto: ${stats.marginPct}%`,
                        tone: stats.netProfit >= 0 ? "success" : "danger",
                      },
                      {
                        label: "ÓRDENES & TICKET",
                        value: `${num.format(stats.totalOrders)} órd.`,
                        sub: `Ticket prom: ${money.format(stats.avgTicket)}`,
                        tone: "accent",
                      },
                    ],
                    notes: [
                      `Rentabilidad consolidada del periodo: ${money.format(stats.netProfit)} (${stats.marginPct}% sobre ingresos brutos).`,
                      `Base comercial acumulada: ${num.format(stats.totalOrders)} órdenes procesadas y ${num.format(stats.totalCustomers)} clientes registrados.`,
                    ],
                    rows: exportRows,
                  })
                }
              >
                PDF
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel({ sheetName: title, rows: exportRows })}>Excel</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV({ filename: `${title}.csv`, rows: exportRows })}>CSV</button>
            </>
          )}
        </div>
      </div>

      {/* KPIs Financieros del Reporte */}
      {rows?.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="card p-4">
              <p className="text-xs text-muted">Ingresos Brutos</p>
              <p className="text-lg font-semibold num mt-0.5">{money.format(stats.totalRevenue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted">Gastos / Costos</p>
              <p className="text-lg font-semibold num mt-0.5">{money.format(stats.totalExpenses)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted">Utilidad Neta ({stats.marginPct}%)</p>
              <p className="text-lg font-semibold num mt-0.5" style={{ color: "var(--success)" }}>
                {money.format(stats.netProfit)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted">Órdenes Totales</p>
              <p className="text-lg font-semibold num mt-0.5">{num.format(stats.totalOrders)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted">Ticket Promedio</p>
              <p className="text-lg font-semibold num mt-0.5">{money.format(stats.avgTicket)}</p>
            </div>
          </div>

          <ChartCard
            title="Evolución Financiera del Reporte"
            subtitle="Comparativa de Ingresos, Gastos y Utilidad Neta por periodo"
            type="area"
            height={230}
            data={enrichedRows}
            xKey="month"
            series={[
              { dataKey: "revenue", label: "Ingresos ($)", colorIndex: 0 },
              { dataKey: "profit", label: "Utilidad Neta ($)", colorIndex: 1 },
              { dataKey: "expenses", label: "Gastos ($)", colorIndex: 2 },
            ]}
          />
        </>
      )}

      {/* Formulario para agregar registro manual */}
      <div className="card p-5">
        <h2 className="section-title mb-3">Agregar registro financiero / operativo</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2">
          <input
            placeholder="Periodo (ej. Sep)"
            required
            value={form.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
            className="input"
            aria-label="Mes"
          />
          <input
            placeholder="Ingresos ($)"
            required
            type="number"
            min="0"
            value={form.revenue}
            onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
            className="input"
            aria-label="Ingresos"
          />
          <input
            placeholder="Gastos ($ opc.)"
            type="number"
            min="0"
            value={form.expenses}
            onChange={(e) => setForm((f) => ({ ...f, expenses: e.target.value }))}
            className="input"
            aria-label="Gastos"
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
          <input
            placeholder="Clientes (opc.)"
            type="number"
            min="0"
            value={form.customers}
            onChange={(e) => setForm((f) => ({ ...f, customers: e.target.value }))}
            className="input"
            aria-label="Clientes"
          />
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Guardando…" : "Agregar"}
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

      {enrichedRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Periodo / Mes</th>
                  <th className="!text-right">Ingresos</th>
                  <th className="!text-right">Gastos</th>
                  <th className="!text-right">Utilidad Neta</th>
                  <th className="!text-right">Margen</th>
                  <th className="!text-right">Órdenes</th>
                  <th className="!text-right">Clientes</th>
                  <th aria-label="Acciones" className="!text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enrichedRows.map((r) => {
                  const isEditing = editingRowId === r.id;
                  return (
                    <tr key={r.id}>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              value={editForm.month}
                              onChange={(e) => setEditForm({ ...editForm, month: e.target.value })}
                              className="input !h-7 !text-xs w-24"
                            />
                          </td>
                          <td className="text-right">
                            <input
                              type="number"
                              value={editForm.revenue}
                              onChange={(e) => setEditForm({ ...editForm, revenue: e.target.value })}
                              className="input !h-7 !text-xs w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="text-right">
                            <input
                              type="number"
                              value={editForm.expenses}
                              onChange={(e) => setEditForm({ ...editForm, expenses: e.target.value })}
                              className="input !h-7 !text-xs w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="text-right text-xs text-muted">Auto</td>
                          <td className="text-right text-xs text-muted">Auto</td>
                          <td className="text-right">
                            <input
                              type="number"
                              value={editForm.orders}
                              onChange={(e) => setEditForm({ ...editForm, orders: e.target.value })}
                              className="input !h-7 !text-xs w-20 text-right ml-auto"
                            />
                          </td>
                          <td className="text-right">
                            <input
                              type="number"
                              value={editForm.customers}
                              onChange={(e) => setEditForm({ ...editForm, customers: e.target.value })}
                              className="input !h-7 !text-xs w-20 text-right ml-auto"
                            />
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => saveEditRow(r.id)}
                              className="btn btn-primary btn-sm btn-icon !h-7 !w-7 mr-1"
                              title="Guardar"
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowId(null)}
                              className="btn btn-ghost btn-sm btn-icon !h-7 !w-7"
                              title="Cancelar"
                            >
                              <IconX size={14} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-medium" style={{ color: "var(--text)" }}>{r.month}</td>
                          <td className="text-right num font-mono">{money.format(r.revenue)}</td>
                          <td className="text-right num font-mono text-muted">{money.format(r.expenses || 0)}</td>
                          <td
                            className="text-right num font-mono font-semibold"
                            style={{ color: r.profit >= 0 ? "var(--success)" : "var(--danger)" }}
                          >
                            {money.format(r.profit)}
                          </td>
                          <td className="text-right num">
                            <span className={`chip !h-5 !text-[11px] ${r.marginPct >= 25 ? "chip-success" : "chip-accent"}`}>
                              {r.marginPct}%
                            </span>
                          </td>
                          <td className="text-right num font-mono">{num.format(r.orders)}</td>
                          <td className="text-right num font-mono">{num.format(r.customers || 0)}</td>
                          <td className="text-right whitespace-nowrap w-24">
                            <button
                              type="button"
                              onClick={() => startEditing(r)}
                              className="btn btn-ghost btn-sm btn-icon !h-7 !w-7 mr-1"
                              title="Editar fila"
                            >
                              <IconEdit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRowToDelete(r)}
                              className="btn btn-danger btn-sm btn-icon !h-7 !w-7"
                              title="Eliminar registro"
                              aria-label={`Eliminar fila ${r.month}`}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
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

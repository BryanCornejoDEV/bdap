import { useState } from "react";
import Layout from "../components/Layout";
import { useParams } from "react-router-dom";
import { useGet } from "../hooks/useApi";
import { addRow } from "../services/reports";
import { useQueryClient } from "@tanstack/react-query";

export default function ReportDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: rows, isLoading } = useGet(`/reports/${id}/rows`);
  const [form, setForm] = useState({ month: "", revenue: "", orders: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addRow(Number(id), { month: form.month, revenue: Number(form.revenue), orders: Number(form.orders) });
      await qc.invalidateQueries([`/reports/${id}/rows`]);
      setForm({ month: "", revenue: "", orders: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center gap-2 text-sm opacity-70 mb-2">
        <span>📄</span>
        <span>/</span>
        <span>Reporte {id}</span>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Reporte {id}</h1>

      <div className="md2-card p-4 mb-4">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input placeholder="Mes" required value={form.month} onChange={(e)=>setForm(f=>({...f,month:e.target.value}))} className="border p-2 rounded" />
          <input placeholder="Revenue" required value={form.revenue} onChange={(e)=>setForm(f=>({...f,revenue:e.target.value}))} className="border p-2 rounded" />
          <input placeholder="Orders" required value={form.orders} onChange={(e)=>setForm(f=>({...f,orders:e.target.value}))} className="border p-2 rounded" />
          <button disabled={saving} className="md2-grad text-white px-4 py-2 rounded">{saving?"Guardando...":"Agregar fila"}</button>
        </form>
      </div>

      {isLoading && <p>Cargando filas…</p>}
      {!isLoading && (!rows || rows.length === 0) && <p>No hay filas</p>}
      {rows && (
        <div className="md2-card p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="glass-strong"><th className="px-3 py-2">Mes</th><th className="px-3 py-2">Revenue</th><th className="px-3 py-2">Orders</th></tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-t"><td className="px-3 py-2">{r.month}</td><td className="px-3 py-2">{r.revenue}</td><td className="px-3 py-2">{r.orders}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

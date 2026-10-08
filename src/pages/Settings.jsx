import { useState } from "react";
import Layout from "../components/Layout";
import api from "../services/apiClient";

export default function Settings(){
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'error', text }

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (form.newPassword !== form.confirm) {
      setMessage({ type: "error", text: "Las passwords nuevas no coinciden" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage({ type: "ok", text: "Password actualizada correctamente" });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error || "No se pudo cambiar la password" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-sub">Preferencias de tu cuenta</p>
      </div>

      <div className="card p-5 max-w-md">
        <h2 className="section-title mb-1">Cambiar password</h2>
        <p className="text-xs text-muted mb-4">La nueva password debe tener al menos 8 caracteres.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="current" className="field-label">Password actual</label>
            <input
              id="current"
              type="password"
              required
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e)=>setForm(f=>({...f,currentPassword:e.target.value}))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="new" className="field-label">Nueva password</label>
            <input
              id="new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e)=>setForm(f=>({...f,newPassword:e.target.value}))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="field-label">Confirmar nueva password</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e)=>setForm(f=>({...f,confirm:e.target.value}))}
              className="input"
            />
          </div>
          {message && (
            <p className="text-sm" style={{ color: message.type === "ok" ? "var(--success)" : "var(--danger)" }} role="status">
              {message.text}
            </p>
          )}
          <button disabled={saving} className="btn btn-primary">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useAuth } from "../auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";
import { IconPlus, IconTrash } from "../components/icons";

export default function Users() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data, isLoading, isError } = useGet("/users");
  const [form, setForm] = useState({ email: "", password: "", role: "analyst" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["/users"] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/users", form);
      await refresh();
      setForm({ email: "", password: "", role: "analyst" });
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id, role) => {
    setError("");
    try {
      await api.patch(`/users/${id}`, { role });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo cambiar el rol");
    }
  };

  const remove = async (id, email) => {
    if (!window.confirm(`¿Eliminar al usuario ${email}?`)) return;
    setError("");
    try {
      await api.delete(`/users/${id}`);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo eliminar el usuario");
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="page-title">Usuarios</h1>
        <p className="page-sub">Gestiona el acceso a la plataforma</p>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-3">Nuevo usuario</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}
            className="input"
            aria-label="Email"
          />
          <input
            placeholder="Password (mín. 8)"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e)=>setForm(f=>({...f,password:e.target.value}))}
            className="input"
            aria-label="Password"
          />
          <select
            value={form.role}
            onChange={(e)=>setForm(f=>({...f,role:e.target.value}))}
            className="select"
            aria-label="Rol"
          >
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Creando…" : "Crear usuario"}
          </button>
        </form>
        {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {isLoading && <p className="text-muted text-sm">Cargando usuarios…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--danger)" }}>Error cargando usuarios</p>}

      {data && data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="font-medium" style={{ color: "var(--text)" }}>{u.email}</span>
                      {u.id === me?.sub && <span className="chip chip-accent ml-2">Tú</span>}
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e)=>changeRole(u.id, e.target.value)}
                        className="select select-sm w-28"
                        disabled={u.id === me?.sub}
                        title={u.id === me?.sub ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                        aria-label={`Rol de ${u.email}`}
                      >
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="num">{new Date(u.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="text-right w-14">
                      {u.id !== me?.sub && (
                        <button
                          onClick={()=>remove(u.id, u.email)}
                          className="btn btn-danger btn-sm btn-icon"
                          title="Eliminar usuario"
                          aria-label={`Eliminar ${u.email}`}
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
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

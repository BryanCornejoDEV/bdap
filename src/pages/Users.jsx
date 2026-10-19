import { useState } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useAuth } from "../auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";
import { IconPlus, IconTrash } from "../components/icons";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

export default function Users() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user: me } = useAuth();
  const { data, isLoading, isError } = useGet("/users");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "analyst" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["/users"] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/users", form);
      await refresh();
      setForm({ name: "", email: "", password: "", role: "analyst" });
      toast.success("Usuario creado y asignado a la organización activa");
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo crear el usuario";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id, role) => {
    setError("");
    try {
      await api.patch(`/users/${id}`, { role });
      await refresh();
      toast.success("Rol global actualizado");
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo cambiar el rol";
      setError(msg);
      toast.error(msg);
    }
  };

  const confirmRemove = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/users/${userToDelete.id}`);
      await refresh();
      toast.success(`Usuario ${userToDelete.email} eliminado`);
    } catch (err) {
      const msg = err?.response?.data?.error || "No se pudo eliminar el usuario";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
      setUserToDelete(null);
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="page-title">Usuarios Globales del Sistema</h1>
        <p className="page-sub">
          Administración centralizada de cuentas, privilegios globales y membresías multi-empresa
        </p>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-3">Registrar nuevo usuario</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            placeholder="Nombre completo"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
            aria-label="Nombre"
          />
          <input
            placeholder="Email corporativo"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="input"
            aria-label="Email"
          />
          <input
            placeholder="Password (mín. 8)"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="input"
            aria-label="Password"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="select"
            aria-label="Rol"
          >
            <option value="analyst">Analyst</option>
            <option value="admin">Admin Global</option>
          </select>
          <button disabled={saving} className="btn btn-primary">
            <IconPlus size={16} />
            {saving ? "Creando…" : "Crear cuenta"}
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
                  <th>Colaborador</th>
                  <th>Empresas Asignadas</th>
                  <th>Rol Global</th>
                  <th>Fecha Alta</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: "var(--text)" }}>
                          {u.name || u.email.split("@")[0]}
                        </span>
                        {u.id === me?.sub && <span className="chip chip-accent">Tú</span>}
                      </div>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(u.memberships || []).map((m) => (
                          <span key={m.orgId} className="chip !text-[11px]">
                            {m.org?.name || `Org #${m.orgId}`} ({m.role})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="select select-sm w-32"
                        disabled={u.id === me?.sub}
                        title={u.id === me?.sub ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                        aria-label={`Rol de ${u.email}`}
                      >
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin Global</option>
                      </select>
                    </td>
                    <td className="num text-xs">
                      {new Date(u.createdAt).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="text-right w-14">
                      {u.id !== me?.sub && (
                        <button
                          onClick={() => setUserToDelete(u)}
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

      <ConfirmModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmRemove}
        title="¿Eliminar usuario?"
        message={`¿Estás seguro de que deseas revocar el acceso y eliminar la cuenta de ${userToDelete?.email}?`}
        confirmText="Eliminar usuario"
        loading={deleting}
      />
    </Layout>
  );
}

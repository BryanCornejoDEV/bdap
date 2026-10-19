import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { useAuth } from "../auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";
import { useToast } from "../context/ToastContext";
import {
  IconOrg,
  IconPlus,
  IconTrash,
  IconUsers,
  IconActivity,
  IconCheck,
  IconSettings,
} from "../components/icons";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Organizations() {
  const { user, switchOrg } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: orgs = [], isLoading } = useGet("/organizations");
  const activeOrg = orgs.find((o) => o.id === user?.orgId) || orgs[0];

  const { data: members = [], isLoading: loadingMembers } = useGet(
    `/organizations/${activeOrg?.id}/members`,
    {},
    { enabled: Boolean(activeOrg?.id) }
  );

  // Estado para crear nueva empresa
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    industry: "Tecnología & SaaS",
    plan: "enterprise",
    currency: "USD",
  });

  // Estado para editar empresa activa
  const [editOrgForm, setEditOrgForm] = useState({
    name: "",
    industry: "",
    plan: "enterprise",
    currency: "USD",
  });
  const [savingOrgSettings, setSavingOrgSettings] = useState(false);

  // Estado para agregar miembro a la empresa activa
  const [memberForm, setMemberForm] = useState({
    email: "",
    role: "member",
    department: "Analítica",
  });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setEditOrgForm({
        name: activeOrg.name || "",
        industry: activeOrg.industry || "Tecnología & SaaS",
        plan: activeOrg.plan || "enterprise",
        currency: activeOrg.currency || "USD",
      });
    }
  }, [activeOrg]);

  const canManageActiveOrg =
    user?.role === "admin" || activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["/organizations"] });
    if (activeOrg?.id) {
      qc.invalidateQueries({ queryKey: [`/organizations/${activeOrg.id}/members`] });
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setCreatingOrg(true);
    try {
      const { data: created } = await api.post("/organizations", newOrgForm);
      await refreshAll();
      setNewOrgForm({ name: "", industry: "Tecnología & SaaS", plan: "enterprise", currency: "USD" });
      setShowCreateOrg(false);
      toast.success(`Empresa "${created.name}" aprovisionada. Cambiando entorno…`);
      await switchOrg(created.id);
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo crear la empresa");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleUpdateOrgSettings = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSavingOrgSettings(true);
    try {
      await api.patch(`/organizations/${activeOrg.id}`, editOrgForm);
      await refreshAll();
      toast.success("Parámetros de la empresa actualizados");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al actualizar empresa");
    } finally {
      setSavingOrgSettings(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;
    setAddingMember(true);
    try {
      await api.post(`/organizations/${activeOrg.id}/members`, memberForm);
      await refreshAll();
      setMemberForm({ email: "", role: "member", department: "Analítica" });
      toast.success("Miembro asignado a la organización");
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo agregar el miembro");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (targetUserId, email) => {
    if (!activeOrg) return;
    try {
      await api.delete(`/organizations/${activeOrg.id}/members/${targetUserId}`);
      await refreshAll();
      toast.success(`Acceso revocado para ${email}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo eliminar al miembro");
    }
  };

  const handleSwitch = async (org) => {
    if (org.id === user?.orgId) return;
    try {
      await switchOrg(org.id);
      toast.success(`Entorno activo: ${org.name}`);
    } catch {
      toast.error("Error al cambiar de organización");
    }
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Centro Multi-Empresa & Equipos</h1>
            <span className="chip chip-accent font-semibold">{orgs.length} Empresas</span>
          </div>
          <p className="page-sub">
            Arquitectura multi-tenant aislada con balanceo de caché en memoria, cuotas por plan y gestión de colaboradores
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateOrg(!showCreateOrg)}
          className="btn btn-primary btn-sm"
        >
          <IconPlus size={15} />
          {showCreateOrg ? "Cancelar" : "Aprovisionar Nueva Empresa"}
        </button>
      </div>

      {/* Formulario Aprovisionar Nueva Empresa */}
      {showCreateOrg && (
        <div className="card p-5">
          <h2 className="section-title mb-1">Aprovisionar nueva organización en BDAP</h2>
          <p className="text-xs text-muted mb-4">
            Se creará un contenedor de datos aislado con su propio espacio de reportes, OKRs, tablero operativo y auditoría.
          </p>
          <form onSubmit={handleCreateOrg} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="field-label">Razón Social / Nombre Comercial</label>
              <input
                required
                placeholder="Ej. Wayne Enterprises Latam"
                value={newOrgForm.name}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Industria / Sector</label>
              <input
                placeholder="Ej. Logística & Cadena de Suministro"
                value={newOrgForm.industry}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, industry: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Nivel de Plan</label>
              <select
                value={newOrgForm.plan}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, plan: e.target.value })}
                className="select"
              >
                <option value="enterprise">Enterprise (Ilimitado)</option>
                <option value="business">Business (Crecimiento)</option>
                <option value="starter">Starter (PyME)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button disabled={creatingOrg} type="submit" className="btn btn-primary w-full">
                <IconCheck size={16} />
                {creatingOrg ? "Aprovisionando…" : "Crear Empresa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted">Cargando clúster de organizaciones…</p>}

      {/* Tarjetas de Empresas Multi-Tenant */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((o) => {
          const isCurrent = o.id === user?.orgId;
          return (
            <div
              key={o.id}
              className="card p-5 flex flex-col justify-between gap-4 card-hover"
              style={isCurrent ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" } : undefined}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0"
                      style={{ background: isCurrent ? "var(--accent)" : "var(--text-2)" }}
                    >
                      <IconOrg size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text)" }}>
                        {o.name}
                      </h3>
                      <p className="text-[11px] text-muted truncate">{o.industry}</p>
                    </div>
                  </div>
                  <span className={`chip uppercase !h-5 !text-[10px] font-semibold ${isCurrent ? "chip-success" : "chip-accent"}`}>
                    {isCurrent ? "Activa" : o.plan}
                  </span>
                </div>

                {/* Resumen Financiero y de Recursos */}
                <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 rounded-lg border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-[11px] text-muted">Ingresos Consolidados</p>
                    <p className="font-semibold text-sm num mt-0.5">{money.format(o.metrics?.totalRevenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted">Utilidad (Margen)</p>
                    <p className="font-semibold text-sm num mt-0.5" style={{ color: "var(--success)" }}>
                      {money.format(o.metrics?.netProfit || 0)} ({o.metrics?.marginPct ?? 0}%)
                    </p>
                  </div>
                </div>

                {/* Contadores de Módulos y Telemetría */}
                <div className="mt-3 space-y-1.5 text-xs text-muted">
                  <div className="flex justify-between">
                    <span>Recursos aislados:</span>
                    <strong className="num" style={{ color: "var(--text-2)" }}>
                      {o.counts?.reports || 0} reportes · {o.counts?.goals || 0} OKRs · {o.counts?.tasks || 0} tareas
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Miembros & Rol:</span>
                    <strong className="capitalize" style={{ color: "var(--text-2)" }}>
                      {o.counts?.members || 1} usuarios · Tu rol: {o.role}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="inline-flex items-center gap-1">
                      <IconActivity size={12} className="text-emerald-500" />
                      Telemetría Tenant:
                    </span>
                    <span className="num font-mono text-[11px]">
                      {o.telemetry?.avgLatencyMs || 2.1}ms · Hit {o.telemetry?.cacheHitRate || 95}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                <span className="text-[11px] text-muted font-mono">ID #{o.id} · {o.currency}</span>
                {isCurrent ? (
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    Contexto en uso
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitch(o)}
                    className="btn btn-primary btn-sm"
                  >
                    Operar esta empresa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gestión Detallada de la Empresa Activa */}
      {activeOrg && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Miembros de la Empresa Activa (7 cols) */}
          <div className="lg:col-span-7 card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IconUsers size={18} style={{ color: "var(--accent)" }} />
                  <div>
                    <h2 className="section-title">Colaboradores en {activeOrg.name}</h2>
                    <p className="text-xs text-muted">
                      Control de acceso basado en roles (RBAC) y departamentos para esta empresa
                    </p>
                  </div>
                </div>
                <span className="chip text-xs num">{members.length} miembros</span>
              </div>

              {canManageActiveOrg && (
                <form
                  onSubmit={handleAddMember}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-lg border"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <input
                    type="email"
                    required
                    placeholder="Email de usuario (ej. ops@bdap.local)"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="input !h-8 !text-xs sm:col-span-2"
                  />
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="select select-sm !h-8 !text-xs"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button disabled={addingMember} type="submit" className="btn btn-primary btn-sm !h-8">
                    <IconPlus size={14} />
                    Asignar
                  </button>
                </form>
              )}

              {loadingMembers ? (
                <p className="text-xs text-muted py-4">Cargando miembros…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Departamento</th>
                        <th>Rol en Empresa</th>
                        <th aria-label="Acción"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.userId}>
                          <td>
                            <p className="font-medium text-sm" style={{ color: "var(--text)" }}>
                              {m.name}
                            </p>
                            <p className="text-xs text-muted">{m.email}</p>
                          </td>
                          <td>
                            <span className="chip !text-xs">{m.department}</span>
                          </td>
                          <td>
                            <span className="chip chip-accent capitalize !text-xs">{m.orgRole}</span>
                          </td>
                          <td className="text-right">
                            {canManageActiveOrg && m.userId !== user?.sub && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.userId, m.email)}
                                className="btn btn-danger btn-sm btn-icon"
                                title="Revocar de esta organización"
                              >
                                <IconTrash size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Parámetros Corporativos de la Empresa Activa (5 cols) */}
          <div className="lg:col-span-5 card p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconSettings size={18} style={{ color: "var(--accent)" }} />
              <div>
                <h2 className="section-title">Configuración de {activeOrg.name}</h2>
                <p className="text-xs text-muted">Parámetros corporativos del tenant activo</p>
              </div>
            </div>

            <form onSubmit={handleUpdateOrgSettings} className="space-y-3">
              <div>
                <label className="field-label">Nombre de la Organización</label>
                <input
                  required
                  disabled={!canManageActiveOrg}
                  value={editOrgForm.name}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label">Sector / Industria</label>
                <input
                  disabled={!canManageActiveOrg}
                  value={editOrgForm.industry}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, industry: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Plan Multi-Tenant</label>
                  <select
                    disabled={!canManageActiveOrg}
                    value={editOrgForm.plan}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, plan: e.target.value })}
                    className="select"
                  >
                    <option value="enterprise">Enterprise</option>
                    <option value="business">Business</option>
                    <option value="starter">Starter</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Divisa Base</label>
                  <select
                    disabled={!canManageActiveOrg}
                    value={editOrgForm.currency}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, currency: e.target.value })}
                    className="select"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="COP">COP ($)</option>
                  </select>
                </div>
              </div>

              {canManageActiveOrg && (
                <div className="pt-2">
                  <button disabled={savingOrgSettings} type="submit" className="btn btn-primary w-full">
                    {savingOrgSettings ? "Guardando…" : "Guardar Parámetros Corporativos"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

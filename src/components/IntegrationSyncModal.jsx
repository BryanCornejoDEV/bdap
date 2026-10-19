import { useState } from "react";
import Modal from "./Modal";
import { IconCheck, IconFileSpreadsheet } from "./icons";
import { syncIntegrationToReport } from "../services/integrations";
import { useGet } from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

export default function IntegrationSyncModal({
  isOpen,
  onClose,
  provider,
  providerName,
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: reports, isLoading: loadingReports } = useGet("/reports");

  const [mode, setMode] = useState("existing"); // 'existing' | 'new'
  const [selectedReportId, setSelectedReportId] = useState("");
  const [newReportName, setNewReportName] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncedResult, setSyncedResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSyncing(true);
    setSyncedResult(null);

    try {
      const payload = mode === "existing"
        ? { reportId: Number(selectedReportId) }
        : { newReportName: newReportName.trim() };

      const res = await syncIntegrationToReport(provider, payload);
      setSyncedResult(res);
      toast.success(res.message || "Datos sincronizados correctamente con el reporte");
    } catch (err) {
      const msg = err?.response?.data?.error || "Error sincronizando con el reporte";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleGoToReport = () => {
    if (syncedResult?.reportId) {
      onClose();
      navigate(`/reports/${syncedResult.reportId}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sincronizar ${providerName} con Reporte`} maxWidth="max-w-md">
      {syncedResult ? (
        <div className="space-y-4 py-2 text-center animate-in fade-in duration-150">
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white"
            style={{ background: "var(--success)" }}
          >
            <IconCheck size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>
              ¡Sincronización completada!
            </h3>
            <p className="text-xs text-muted mt-1 px-4">
              {syncedResult.message}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              Cerrar
            </button>
            <button onClick={handleGoToReport} className="btn btn-primary btn-sm">
              Ver reporte ahora
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Convierte y exporta las métricas temporales de {providerName} directamente a las tablas y gráficos de un reporte de BDAP.
          </p>

          <div className="flex gap-2 p-1 bg-surface-2 rounded-lg border text-xs" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                mode === "existing" ? "bg-surface shadow-sm font-semibold" : "text-muted hover:text-text"
              }`}
              onClick={() => setMode("existing")}
            >
              Reporte existente
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                mode === "new" ? "bg-surface shadow-sm font-semibold" : "text-muted hover:text-text"
              }`}
              onClick={() => setMode("new")}
            >
              Crear nuevo reporte
            </button>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="field-label" htmlFor="sync-report-select">
                Selecciona el reporte destino
              </label>
              {loadingReports ? (
                <p className="text-xs text-muted">Cargando reportes…</p>
              ) : reports?.length ? (
                <select
                  id="sync-report-select"
                  required
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="select"
                >
                  <option value="">-- Elige un reporte --</option>
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted">
                  No hay reportes disponibles. Selecciona la opción &quot;Crear nuevo reporte&quot;.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="field-label" htmlFor="new-report-name">
                Nombre del nuevo reporte
              </label>
              <input
                id="new-report-name"
                required
                type="text"
                placeholder={`ej. Métricas ${providerName} ${new Date().getFullYear()}`}
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                className="input text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={syncing || (mode === "existing" && !selectedReportId) || (mode === "new" && !newReportName.trim())}
              className="btn btn-primary btn-sm"
            >
              <IconFileSpreadsheet size={14} />
              {syncing ? "Sincronizando…" : "Sincronizar datos"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

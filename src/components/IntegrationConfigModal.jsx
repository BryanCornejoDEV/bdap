import { useState, useEffect } from "react";
import Modal from "./Modal";
import { IconCheck, IconAlertTriangle, IconKey, IconExternalLink, IconTrash } from "./icons";
import { testIntegrationConnection, saveIntegrationConfig, disconnectIntegration } from "../services/integrations";
import { useToast } from "../context/ToastContext";

export default function IntegrationConfigModal({
  isOpen,
  onClose,
  provider,
  configData,
  onSaved,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok: boolean, message: string }
  const [disconnecting, setDisconnecting] = useState(false);

  // Estados del formulario
  const [form, setForm] = useState({
    apiKey: "",
    currency: "USD",
    accessToken: "",
    propertyId: "",
    clientEmail: "",
    privateKey: "",
    isDemo: false,
    enabled: true,
  });

  const [jsonPaste, setJsonPaste] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setJsonPaste("");
      setShowKey(false);

      if (configData) {
        setForm({
          apiKey: configData.maskedApiKey || "",
          currency: configData.currency || "USD",
          accessToken: configData.maskedAccessToken || "",
          propertyId: configData.propertyId || "",
          clientEmail: configData.clientEmail || "",
          privateKey: configData.hasPrivateKey ? "••••••••••••••••" : "",
          isDemo: Boolean(configData.isDemo),
          enabled: configData.enabled !== false,
        });
      } else {
        setForm({
          apiKey: "",
          currency: "USD",
          accessToken: "",
          propertyId: "",
          clientEmail: "",
          privateKey: "",
          isDemo: false,
          enabled: true,
        });
      }
    }
  }, [isOpen, configData]);

  // Manejar pegado de JSON de Google Cloud Service Account
  const handleJsonPaste = (text) => {
    setJsonPaste(text);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      if (parsed.client_email && parsed.private_key) {
        setForm((prev) => ({
          ...prev,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        }));
        toast.success("Credenciales de Service Account extraídas del JSON");
      }
    } catch {
      // no es JSON válido todavía, omitir
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testIntegrationConnection(provider, form);
      setTestResult({
        ok: res.ok,
        message: res.message || "Conexión probada exitosamente con el proveedor.",
      });
      if (res.ok) {
        toast.success("Prueba de conexión exitosa");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Error al conectar con la API externa";
      setTestResult({
        ok: false,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveIntegrationConfig(provider, form);
      toast.success("Configuración guardada correctamente");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || "Error guardando la configuración";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("¿Seguro que deseas desconectar esta integración y eliminar las credenciales?")) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnectIntegration(provider);
      toast.success("Integración desconectada");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || "Error desconectando integración";
      toast.error(msg);
    } finally {
      setDisconnecting(false);
    }
  };

  const getProviderInfo = () => {
    switch (provider) {
      case "stripe":
        return {
          title: "Configurar Stripe",
          description: "Conecta tu cuenta de Stripe para obtener ingresos, balances y suscripciones en tiempo real.",
          docsUrl: "https://dashboard.stripe.com/apikeys",
          docsLabel: "Obtener clave en Stripe Dashboard",
        };
      case "hubspot":
        return {
          title: "Configurar HubSpot CRM",
          description: "Conecta tu portal de HubSpot mediante un Private App Token para leer leads, contactos y clientes.",
          docsUrl: "https://app.hubspot.com/settings/api-tokens",
          docsLabel: "Crear Private App en HubSpot",
        };
      case "google-analytics":
        return {
          title: "Configurar Google Analytics 4",
          description: "Conecta una propiedad GA4 mediante cuenta de servicio de Google Cloud para métricas de tráfico.",
          docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
          docsLabel: "Guía de Service Account para GA4",
        };
      default:
        return { title: "Configurar integración", description: "", docsUrl: "", docsLabel: "" };
    }
  };

  const info = getProviderInfo();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={info.title} maxWidth="max-w-xl">
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">{info.description}</p>

        {info.docsUrl && (
          <a
            href={info.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            style={{ color: "var(--accent)" }}
          >
            <IconExternalLink size={13} />
            {info.docsLabel}
          </a>
        )}

        {/* ===================== STRIPE ===================== */}
        {provider === "stripe" && (
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="field-label mb-0" htmlFor="stripe-key">
                  Stripe Secret API Key (sk_test_... o sk_live_...)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-muted hover:text-primary underline"
                >
                  {showKey ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <div className="relative">
                <input
                  id="stripe-key"
                  type={showKey ? "text" : "password"}
                  placeholder="sk_test_51Mz..."
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="input font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-muted mt-1">
                Se aceptan claves secretas o restricted keys con permisos de Balance y Charges.
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="stripe-currency">
                Moneda predeterminada
              </label>
              <select
                id="stripe-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="select"
              >
                <option value="USD">USD - Dólar estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso mexicano</option>
                <option value="COP">COP - Peso colombiano</option>
                <option value="GBP">GBP - Libra esterlina</option>
              </select>
            </div>
          </div>
        )}

        {/* ===================== HUBSPOT ===================== */}
        {provider === "hubspot" && (
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="field-label mb-0" htmlFor="hubspot-token">
                  Private App Access Token (pat-na1-...)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-muted hover:text-primary underline"
                >
                  {showKey ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <input
                id="hubspot-token"
                type={showKey ? "text" : "password"}
                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                className="input font-mono text-xs"
              />
              <p className="text-[11px] text-muted mt-1">
                Requiere scope de lectura: <code className="px-1 py-0.5 rounded bg-surface-2">crm.objects.contacts.read</code>.
              </p>
            </div>
          </div>
        )}

        {/* ===================== GOOGLE ANALYTICS ===================== */}
        {provider === "google-analytics" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="field-label" htmlFor="ga-prop-id">
                GA4 Property ID (números)
              </label>
              <input
                id="ga-prop-id"
                type="text"
                placeholder="ej. 312345678"
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                className="input"
              />
              <p className="text-[11px] text-muted mt-1">
                Encuéntralo en GA4 &gt; Administrar &gt; Detalles de la propiedad &gt; ID de propiedad.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-dashed" style={{ borderColor: "var(--border)" }}>
              <label className="field-label" htmlFor="ga-json-paste">
                Pegar JSON de Service Account (autocompleta Email y Clave):
              </label>
              <textarea
                id="ga-json-paste"
                rows={2}
                value={jsonPaste}
                onChange={(e) => handleJsonPaste(e.target.value)}
                placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                className="input font-mono text-[11px] h-16 py-1.5 resize-none"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="ga-email">
                Client Email de la Cuenta de Servicio
              </label>
              <input
                id="ga-email"
                type="email"
                placeholder="mi-servicio@proyecto.iam.gserviceaccount.com"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="ga-key">
                Private Key (PEM con cabecera -----BEGIN PRIVATE KEY-----)
              </label>
              <textarea
                id="ga-key"
                rows={3}
                placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC..."
                value={form.privateKey}
                onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
                className="input font-mono text-[11px] h-20 py-1.5 resize-none"
              />
            </div>
          </div>
        )}

        {/* Modo Demo / Simulación Toggle */}
        <div className="p-3 rounded-lg bg-surface-2 border" style={{ borderColor: "var(--border)" }}>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isDemo}
              onChange={(e) => setForm({ ...form, isDemo: e.target.checked })}
              className="mt-0.5"
            />
            <div>
              <span className="text-xs font-medium block" style={{ color: "var(--text)" }}>
                Modo Demostración / Simulación
              </span>
              <span className="text-[11px] text-muted leading-tight block mt-0.5">
                Si está activado, la plataforma mostrará datos de muestra para pruebas sin realizar llamadas al API externo.
              </span>
            </div>
          </label>
        </div>

        {/* Resultado del test de conexión */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in duration-150`}
            style={{
              background: testResult.ok ? "rgba(10, 125, 51, 0.08)" : "rgba(208, 59, 59, 0.08)",
              borderColor: testResult.ok ? "var(--success)" : "var(--danger)",
              color: testResult.ok ? "var(--success)" : "var(--danger)",
            }}
          >
            <span className="shrink-0 mt-0.5">
              {testResult.ok ? <IconCheck size={15} /> : <IconAlertTriangle size={15} />}
            </span>
            <div className="flex-1 font-medium leading-relaxed">{testResult.message}</div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            {configData?.configured && (
              <button
                type="button"
                disabled={disconnecting}
                onClick={handleDisconnect}
                className="btn btn-danger btn-sm"
              >
                <IconTrash size={14} />
                {disconnecting ? "Desconectando…" : "Desconectar"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing || form.isDemo}
              onClick={handleTestConnection}
              className="btn btn-ghost btn-sm"
              title="Valida las credenciales contra el servidor del proveedor"
            >
              <IconKey size={14} />
              {testing ? "Probando…" : "Probar conexión"}
            </button>

            <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
              {loading ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

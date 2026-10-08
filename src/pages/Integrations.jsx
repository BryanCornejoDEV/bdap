import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";

const num = new Intl.NumberFormat("es");
const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 0 });

function IntegrationCard({ title, loading, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">{title}</h3>
        <span className="chip">Simulada</span>
      </div>
      {loading ? <p className="text-muted text-sm">Cargando…</p> : children}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium num">{value}</span>
    </div>
  );
}

export default function Integrations() {
  const ga = useGet("/integrations/google-analytics/kpis");
  const stripe = useGet("/integrations/stripe/revenue");
  const hub = useGet("/integrations/hubspot/leads");

  return (
    <Layout>
      <div>
        <h1 className="page-title">Integraciones</h1>
        <p className="page-sub">Fuentes de datos externas conectadas a la plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IntegrationCard title="Google Analytics" loading={ga.isLoading}>
          {ga.data && (
            <div>
              <Metric label="Sesiones" value={num.format(ga.data.sessions)} />
              <Metric label="Usuarios" value={num.format(ga.data.users)} />
              <Metric label="Tasa de rebote" value={pct.format(ga.data.bounceRate)} />
            </div>
          )}
        </IntegrationCard>

        <IntegrationCard title="Stripe" loading={stripe.isLoading}>
          {stripe.data && (
            <div>
              <Metric label="Total" value={money.format(stripe.data.total)} />
              <Metric label="MRR" value={money.format(stripe.data.mrr)} />
              <Metric label="ARR" value={money.format(stripe.data.arr)} />
            </div>
          )}
        </IntegrationCard>

        <IntegrationCard title="HubSpot" loading={hub.isLoading}>
          {hub.data && (
            <ul className="grid gap-1.5">
              {hub.data.map((h) => (
                <li key={h.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{h.name}</span>
                  <span className="chip">{h.status}</span>
                </li>
              ))}
            </ul>
          )}
        </IntegrationCard>
      </div>
    </Layout>
  );
}

import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";

export default function Integrations() {
  const ga = useGet("/integrations/google-analytics/kpis");
  const stripe = useGet("/integrations/stripe/revenue");
  const hub = useGet("/integrations/hubspot/leads");

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-3">Integraciones</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md2-card p-4">
          <h3 className="font-semibold">Google Analytics</h3>
          {ga.isLoading && <p>Cargando…</p>}
          {ga.data && (
            <ul>
              <li>Sessions: {ga.data.sessions}</li>
              <li>Users: {ga.data.users}</li>
              <li>Bounce Rate: {ga.data.bounceRate}</li>
            </ul>
          )}
        </div>

        <div className="md2-card p-4">
          <h3 className="font-semibold">Stripe</h3>
          {stripe.isLoading && <p>Cargando…</p>}
          {stripe.data && (
            <ul>
              <li>Total: {stripe.data.total}</li>
              <li>MRR: {stripe.data.mrr}</li>
            </ul>
          )}
        </div>

        <div className="md2-card p-4">
          <h3 className="font-semibold">HubSpot</h3>
          {hub.isLoading && <p>Cargando…</p>}
          {hub.data && (
            <ul>
              {hub.data.map(h=> <li key={h.id}>{h.name} — {h.status}</li>)}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

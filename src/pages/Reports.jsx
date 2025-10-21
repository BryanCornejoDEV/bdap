import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";
import { Link } from "react-router-dom";

export default function Reports() {
  const { data: reports, isLoading } = useGet('/reports');
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-3">Reportes</h1>
      {isLoading && <p>Cargando reportes…</p>}
      {reports && (
        <div className="md2-card p-4">
          <ul>
            {reports.map(r => (
              <li key={r.id} className="py-2 border-b flex justify-between">
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs opacity-70">Creado: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/reports/${r.id}`} className="btn-glass">Ver</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  );
}

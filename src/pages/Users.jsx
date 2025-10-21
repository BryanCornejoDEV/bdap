import Layout from "../components/Layout";
import { useGet } from "../hooks/useApi";

export default function Users() {
  const { data, isLoading, isError } = useGet("/users");
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-3">Usuarios</h1>
      {isLoading && <p>Cargando usuarios…</p>}
      {isError && <p>Error cargando usuarios</p>}
      {!isLoading && data?.length === 0 && <p>No hay usuarios</p>}
      {data && (
        <div className="md2-card p-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="glass-strong">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Creado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

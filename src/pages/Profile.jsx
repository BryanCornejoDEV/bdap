import Layout from "../components/Layout";
import { useAuth } from "../auth/AuthContext";
import { useGet } from "../hooks/useApi";

export default function Profile() {
  const { user } = useAuth();
  const { data: orgs } = useGet("/organizations");
  const currentOrg = orgs?.find((o) => o.id === user?.orgId);
  const initial = (user?.email || "?")[0].toUpperCase();

  return (
    <Layout>
      <div>
        <h1 className="page-title">Perfil</h1>
        <p className="page-sub">Información de tu cuenta</p>
      </div>

      <div className="card p-5 max-w-md">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full grid place-items-center text-xl font-semibold text-white"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{user?.email}</p>
            <span className="chip chip-accent mt-1 capitalize">{user?.role}</span>
          </div>
        </div>

        <dl className="mt-5 pt-5 grid gap-3 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Organización actual</dt>
            <dd className="font-medium text-right">{currentOrg?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Rol en la organización</dt>
            <dd className="font-medium text-right capitalize">{currentOrg?.role ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Organizaciones</dt>
            <dd className="font-medium text-right num">{orgs?.length ?? 0}</dd>
          </div>
        </dl>
      </div>
    </Layout>
  );
}

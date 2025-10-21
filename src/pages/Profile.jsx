import Layout from "../components/Layout";
import { useAuth } from "../auth/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-3">Perfil</h1>
      <div className="md2-card p-4">
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>
      </div>
    </Layout>
  );
}

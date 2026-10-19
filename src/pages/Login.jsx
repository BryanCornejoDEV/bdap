import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { IconLogo } from "../components/icons";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      nav("/");
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => {
    setForm({ email, password });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-12 h-12 rounded-xl grid place-items-center text-white mb-3 shadow-md"
            style={{ background: "var(--accent)" }}
          >
            <IconLogo size={26} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">BDAP Enterprise</h1>
            <span className="chip chip-accent !h-5 !text-[10px] font-semibold">v2.0 Argon</span>
          </div>
          <p className="text-sm text-muted mt-1 text-center">
            Plataforma Multi-Empresa de Analítica, OKRs y Productividad Laboral
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">Email Corporativo</label>
            <input
              id="email"
              className="input"
              placeholder="tu@empresa.com"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password"
              className="input"
              placeholder="••••••••"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
            />
          </div>
          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? "Autenticando…" : "Acceder a la Plataforma"}
          </button>

          <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-[11px] text-muted text-center mb-2">
              Acceso rápido multi-empresa (Demostración):
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => quickFill("admin@bdap.local", "admin123")}
                className="btn btn-ghost btn-sm !h-7 !text-[11px]"
              >
                Director (3 Orgs)
              </button>
              <button
                type="button"
                onClick={() => quickFill("analyst@bdap.local", "analyst123")}
                className="btn btn-ghost btn-sm !h-7 !text-[11px]"
              >
                Lead Analyst
              </button>
              <button
                type="button"
                onClick={() => quickFill("ops@bdap.local", "ops12345")}
                className="btn btn-ghost btn-sm !h-7 !text-[11px]"
              >
                Ops Manager
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

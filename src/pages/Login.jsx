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

	return (
		<div className="min-h-screen grid place-items-center p-6">
			<div className="w-full max-w-sm">
				<div className="flex flex-col items-center mb-6">
					<div
						className="w-11 h-11 rounded-xl grid place-items-center text-white mb-3"
						style={{ background: "var(--accent)" }}
					>
						<IconLogo size={24} />
					</div>
					<h1 className="text-xl font-semibold tracking-tight">Inicia sesión en BDAP</h1>
					<p className="text-sm text-muted mt-1">Plataforma de análisis de datos de negocio</p>
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
						<label htmlFor="email" className="field-label">Email</label>
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
						{loading ? "Entrando…" : "Entrar"}
					</button>
					<p className="text-xs text-muted text-center">
						Demo: admin@bdap.local / admin123
					</p>
				</form>
			</div>
		</div>
	);
}

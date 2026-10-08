import { Suspense, lazy, Component } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ToastProvider } from "./context/ToastContext";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Users = lazy(() => import("./pages/Users"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			return (
				<div className="p-6">
					<h1 className="text-xl font-semibold mb-2">Algo salió mal</h1>
					<pre className="text-sm opacity-80 whitespace-pre-wrap">{String(this.state.error)}</pre>
					<button
						className="btn btn-ghost mt-3"
						onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
					>
						Volver al inicio
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

function Loader() {
	return <div className="p-6 text-muted text-sm">Cargando…</div>;
}


export default function App(){
	return (
		<ErrorBoundary>
			<ToastProvider>
				<Suspense fallback={<Loader />}>
					<Routes>
						<Route path="/login" element={<Login />} />
						<Route path="/" element={<ProtectedRoute roles={["admin","analyst"]} /> }>
							<Route index element={<Dashboard />} />
							<Route path="reports" element={<Reports />} />
							<Route path="reports/:id" element={<ReportDetail />} />
							<Route path="integrations" element={<Integrations />} />
							<Route path="profile" element={<Profile />} />
							<Route path="settings" element={<Settings />} />
							<Route element={<ProtectedRoute roles={["admin"]} />}>
								<Route path="users" element={<Users />} />
							</Route>
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</Suspense>
			</ToastProvider>
		</ErrorBoundary>
	);
}

import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Users = lazy(() => import("./pages/Users"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function ErrorBoundary({ error }) {
	return (
		<div className="p-6">
			<h1 className="text-xl font-semibold mb-2">Algo salió mal</h1>
			<pre className="text-sm opacity-80 whitespace-pre-wrap">{String(error)}</pre>
		</div>
	);
}

function Loader() {
	return <div className="p-6">Cargando…</div>;
}


export default function App(){
	return (
		<Suspense fallback={<Loader />}>
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/" element={<ProtectedRoute roles={["admin","analyst"]} /> }>
					<Route index element={<Dashboard />} />
					<Route path="reports" element={<Reports />} />
					<Route path="reports/:id" element={<ReportDetail />} />
					<Route path="users" element={<Users />} />
					<Route path="integrations" element={<Integrations />} />
					<Route path="profile" element={<Profile />} />
					<Route path="settings" element={<Settings />} />
				</Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
		</Suspense>
	);
}
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";


export default function ProtectedRoute({ roles = [] }) {
const { user } = useAuth();
if (!user) return <Navigate to="/login" replace />;
if (roles.length && !roles.includes(user.role)) return <Navigate to="/" replace />;
return <Outlet />;
}
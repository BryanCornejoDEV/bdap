import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";


export default function App(){
return (
<Routes>
<Route path="/login" element={<Login />} />
<Route path="/" element={<ProtectedRoute roles={["admin","analyst"]} /> }>
<Route index element={<Dashboard />} />
<Route path="reports" element={<Reports />} />
</Route>
<Route path="*" element={<NotFound />} />
</Routes>
);
}
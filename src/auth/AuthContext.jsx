import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode"; // <-- import nombrado (no default)
import api from "../services/apiClient";

const AuthCtx = createContext();

// Decodifica el token y devuelve null si es inválido o está expirado
function decodeToken(t) {
  if (!t) return null;
  try {
    const decoded = jwtDecode(t); // { sub, email, role, orgId, exp, iat }
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("bdap_token");
    if (t && !decodeToken(t)) {
      localStorage.removeItem("bdap_token");
      return null;
    }
    return t;
  });
  const [user, setUser] = useState(() => decodeToken(localStorage.getItem("bdap_token")));

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (!decoded) {
        setToken(null);
        return;
      }
      localStorage.setItem("bdap_token", token);
      setUser(decoded);
    } else {
      localStorage.removeItem("bdap_token");
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    const onUnauthorized = () => setToken(null);
    window.addEventListener("bdap:unauthorized", onUnauthorized);
    return () => window.removeEventListener("bdap:unauthorized", onUnauthorized);
  }, []);

  const login = async ({ email, password }) => {
    // Autenticación real contra backend
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
  };

  const switchOrg = async (orgId) => {
    const { data } = await api.post("/auth/switch-org", { orgId });
    setToken(data.token);
  };

  const logout = () => setToken(null);

  const value = useMemo(() => ({ user, token, login, logout, switchOrg }), [user, token]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);

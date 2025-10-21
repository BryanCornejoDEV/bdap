import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode"; // <-- import nombrado (no default)
import api from "../services/apiClient";

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("bdap_token"));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("bdap_token");
    if (!t) return null;
    try {
      return jwtDecode(t); // { sub, email, role, iat, ... }
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("bdap_token", token);
      try {
        setUser(jwtDecode(token));
      } catch {
        setUser(null);
      }
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

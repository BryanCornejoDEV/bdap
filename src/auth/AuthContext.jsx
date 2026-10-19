import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/apiClient";

const AuthCtx = createContext();

function decodeToken(t) {
  if (!t) return null;
  try {
    const decoded = jwtDecode(t); // { sub, email, name, role, orgId, exp, iat }
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
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

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bdap_token", data.token);
    setToken(data.token);
    setUser(decodeToken(data.token));
    qc.invalidateQueries();
  }, [qc]);

  const switchOrg = useCallback(async (orgId) => {
    const { data } = await api.post("/auth/switch-org", { orgId: Number(orgId) });
    localStorage.setItem("bdap_token", data.token);
    setToken(data.token);
    setUser(decodeToken(data.token));
    qc.invalidateQueries();
  }, [qc]);

  const logout = useCallback(() => {
    setToken(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(
    () => ({ user, token, login, logout, switchOrg }),
    [user, token, login, logout, switchOrg]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);

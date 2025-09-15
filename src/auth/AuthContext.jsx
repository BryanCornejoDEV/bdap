import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode"; // <-- import nombrado (no default)

const AuthCtx = createContext();

function b64url(json) {
  return btoa(JSON.stringify(json))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// Crea un JWT demo (sin firma). jwt-decode NO verifica firma, solo decodifica payload.
function makeDemoJwt(payload) {
  const header = { alg: "none", typ: "JWT" };
  return `${b64url(header)}.${b64url(payload)}.`; // firma vacía
}

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

  const login = async ({ email, password }) => {
    // Para demo: genera JWT decodificable
    const role = email.includes("admin") ? "admin" : "analyst";
    const payload = {
      sub: 1,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
    };
    const demoToken = makeDemoJwt(payload);
    setToken(demoToken);
  };

  const logout = () => setToken(null);

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

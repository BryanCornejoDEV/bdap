import axios from "axios";
import { jwtDecode } from "jwt-decode";

function normalizeBase() {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || null;
  if (!base) return import.meta.env.DEV ? "/api" : "https://bdap.onrender.com/api";
  const b = base.replace(/\/+$/, "");
  if (b.endsWith("/api")) return b;
  return b + "/api";
}

const api = axios.create({
  baseURL: normalizeBase(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bdap_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    try {
      const decoded = jwtDecode(token);
      if (decoded?.orgId != null && !config.headers["x-org-id"]) {
        config.headers["x-org-id"] = String(decoded.orgId);
      }
    } catch {
      // ignore decode error
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("bdap_token");
      window.dispatchEvent(new CustomEvent("bdap:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
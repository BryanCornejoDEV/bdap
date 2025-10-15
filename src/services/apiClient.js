import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	timeout: 15000,
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("bdap_token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

api.interceptors.response.use(
	(r) => r,
	(error) => {
		if (error?.response?.status === 401) {
			// Token inválido/expirado: limpiar y redirigir a login
			localStorage.removeItem("bdap_token");
			// Opcional: emitir evento por si se quiere escuchar globalmente
			window.dispatchEvent(new CustomEvent("bdap:unauthorized"));
		}
		return Promise.reject(error);
	}
);

export default api;
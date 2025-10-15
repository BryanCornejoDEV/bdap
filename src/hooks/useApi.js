import { useQuery } from "@tanstack/react-query";
import api from "../services/apiClient";

export function useGet(path, params = {}, options = {}) {
	return useQuery({
		queryKey: [path, params],
		queryFn: async ({ signal }) => {
			const res = await api.get(path, { params, signal });
			return res.data;
		},
		staleTime: 60_000,
		retry: 1,
		...options,
	});
}
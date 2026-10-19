import { useQuery } from "@tanstack/react-query";
import api from "../services/apiClient";
import { useAuth } from "../auth/AuthContext";

export function useGet(path, params = {}, options = {}) {
  const { user } = useAuth();
  const orgScope = path === "/organizations" || path === "/users" ? "global" : (user?.orgId ?? "none");

  return useQuery({
    queryKey: [path, params, orgScope],
    queryFn: async ({ signal }) => {
      const res = await api.get(path, { params, signal });
      return res.data;
    },
    staleTime: 30_000,
    retry: 1,
    ...options,
  });
}
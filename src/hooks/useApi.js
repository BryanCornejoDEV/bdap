import { useQuery } from "@tanstack/react-query";
import api from "../services/apiClient";


export function useGet(path, params = {}, options = {}) {
return useQuery({
queryKey: [path, params],
queryFn: async () => (await api.get(path, { params })).data,
...options,
});
}
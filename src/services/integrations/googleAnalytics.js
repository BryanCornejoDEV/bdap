import api from "../apiClient";

export async function fetchGaKpis(params = {}) {
  const { propertyId, dateRange, ...rest } = params;
  const queryParams = { ...rest, ...(propertyId ? { propertyId } : {}), ...(dateRange || {}) };
  return api.get("/integrations/google-analytics/kpis", { params: queryParams }).then((r) => r.data);
}

export default fetchGaKpis;
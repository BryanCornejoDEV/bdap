// Ejemplo: GA Data API (usar OAuth/Service Account desde backend recomendado)
import api from "../apiClient";
export async function fetchGaKpis({ propertyId, dateRange }) {
return api.get("/integrations/google-analytics/kpis", { params: { propertyId, ...dateRange } })
.then(r=>r.data);
}
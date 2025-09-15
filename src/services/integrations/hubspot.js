import api from "../apiClient";
export const fetchHubspotLeads = (params) => api.get("/integrations/hubspot/leads", { params }).then(r=>r.data);
import api from "../apiClient";

export async function getIntegrationConfigs() {
  const res = await api.get("/integrations/configs");
  return res.data;
}

export async function saveIntegrationConfig(provider, data) {
  const res = await api.post(`/integrations/configs/${provider}`, data);
  return res.data;
}

export async function disconnectIntegration(provider) {
  const res = await api.delete(`/integrations/configs/${provider}`);
  return res.data;
}

export async function testIntegrationConnection(provider, credentials = {}) {
  const res = await api.post(`/integrations/${provider}/test`, credentials);
  return res.data;
}

export async function syncIntegrationToReport(provider, { reportId, newReportName }) {
  const res = await api.post(`/integrations/${provider}/sync-to-report`, {
    reportId,
    newReportName,
  });
  return res.data;
}

export async function fetchGaKpis(params = {}) {
  const res = await api.get("/integrations/google-analytics/kpis", { params });
  return res.data;
}

export async function fetchStripeRevenue(params = {}) {
  const res = await api.get("/integrations/stripe/revenue", { params });
  return res.data;
}

export async function fetchHubspotLeads(params = {}) {
  const res = await api.get("/integrations/hubspot/leads", { params });
  return res.data;
}

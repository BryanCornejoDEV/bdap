import api from "../apiClient";
export const fetchStripeRevenue = (params) => api.get("/integrations/stripe/revenue", { params }).then(r=>r.data);
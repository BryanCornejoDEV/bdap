import api from './apiClient';

export const listReports = () => api.get('/reports').then(r => r.data);
export const getReportRows = (id) => api.get(`/reports/${id}/rows`).then(r => r.data);
export const createReport = (data) => api.post('/reports', data).then(r => r.data);
export const deleteReport = (id) => api.delete(`/reports/${id}`).then(r => r.data);
export const addRow = (id, row) => api.post(`/reports/${id}/rows`, row).then(r => r.data);
export const deleteRow = (id, rowId) => api.delete(`/reports/${id}/rows/${rowId}`).then(r => r.data);

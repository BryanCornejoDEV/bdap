import api from './apiClient';

export const listReports = () => api.get('/reports').then(r => r.data);
export const getReportRows = (id) => api.get(`/reports/${id}/rows`).then(r => r.data);
export const createReport = (data) => api.post('/reports', data).then(r => r.data);
export const deleteReport = (id) => api.delete(`/reports/${id}`).then(r => r.data);
export const addRow = (id, row) => api.post(`/reports/${id}/rows`, row).then(r => r.data);
export const deleteRow = (id, rowId) => api.delete(`/reports/${id}/rows/${rowId}`).then(r => r.data);
export const clearReportRows = (id) => api.delete(`/reports/${id}/rows`).then(r => r.data);
export const bulkAddRows = (id, rows) => api.post(`/reports/${id}/rows/bulk`, { rows }).then(r => r.data);
export const importReportFile = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/reports/${id}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

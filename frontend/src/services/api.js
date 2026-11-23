import axios from 'axios';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Datasets
  getDatasets: () => apiClient.get('/datasets'),
  getDataset: (id) => apiClient.get(`/datasets/${id}`),
  previewDataset: (id, params) => apiClient.get(`/datasets/${id}/preview`, { params }),
  uploadDataset: (formData) => apiClient.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  cleanDataset: (id, options) => apiClient.post(`/datasets/${id}/clean`, options),
  loadSampleDataset: () => apiClient.post('/datasets/load-sample'),
  deleteDataset: (id) => apiClient.delete(`/datasets/${id}`),
  getDatasetDownloadUrl: (id, type = 'cleaned') => `/api/datasets/${id}/download?type=${type}`,

  // R Engine & Scripts
  executeRCode: (payload) => apiClient.post('/r/execute', payload),
  getJobStatus: (jobId) => apiClient.get(`/r/jobs/${jobId}`),
  stopJob: (jobId) => apiClient.post(`/r/jobs/${jobId}/stop`),
  getScripts: (category) => apiClient.get('/r/scripts', { params: { category } }),
  getScript: (id) => apiClient.get(`/r/scripts/${id}`),
  saveScript: (payload) => apiClient.post('/r/scripts', null, { params: payload }),

  // Analytics (Real R powered)
  getDashboard: (datasetId) => apiClient.get('/analytics/dashboard', { params: { dataset_id: datasetId } }),
  runRFM: (payload) => apiClient.post('/analytics/rfm', payload),
  runKMeans: (payload) => apiClient.post('/analytics/kmeans', payload),
  runForecast: (payload) => apiClient.post('/analytics/forecast', payload),
  runSalesAnalysis: (payload) => apiClient.post('/analytics/sales', payload),
  runStatistics: (payload) => apiClient.post('/analytics/statistics', payload),
  getInsights: (datasetId) => apiClient.post('/analytics/insights', null, { params: { dataset_id: datasetId } }),
  runManualAnalysis: (payload) => apiClient.post('/analytics/manual', payload),

  // Analysis History
  getHistory: (params) => apiClient.get('/history', { params }),
  getHistoryDetail: (id) => apiClient.get(`/history/${id}`),
  deleteHistory: (id) => apiClient.delete(`/history/${id}`),

  // Reports
  getReports: () => apiClient.get('/reports'),
  generateReport: (payload) => apiClient.post('/reports/generate', payload),
  getReportDownloadUrl: (id) => `/api/reports/${id}/download`,

  // Settings
  getSettings: () => apiClient.get('/settings'),
  updateSetting: (key, value) => apiClient.post('/settings', null, { params: { key, value } }),
  getRStatus: () => apiClient.get('/settings/r-status')
};

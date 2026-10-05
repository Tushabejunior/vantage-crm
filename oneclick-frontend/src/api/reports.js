import api from './client';

export const getReport = (period) => api.get(`/reports/${period}`);
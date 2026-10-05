import api from './client';

export const generateInsights = () => api.post('/insights/generate');
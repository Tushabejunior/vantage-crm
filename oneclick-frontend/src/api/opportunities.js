import api from './client';

export const getOpportunities = () => api.get('/opportunities');
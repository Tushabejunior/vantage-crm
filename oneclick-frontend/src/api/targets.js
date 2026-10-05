import api from './client';

export const getTargets = () => api.get('/targets');
export const updateTarget = (key, value) => api.put(`/targets/${key}`, { value });
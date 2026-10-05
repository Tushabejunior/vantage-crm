import api from './client';

export const getSetupStatus = () => api.get('/auth/setup-status');
export const createAdmin = (name, pin) => api.post('/auth/create-admin', { name, pin });
export const login = (userId, pin) => api.post('/auth/login', { userId, pin });
export const listUsers = () => api.get('/auth/users');
export const addViewer = (name, pin) => api.post('/auth/add-viewer', { name, pin });
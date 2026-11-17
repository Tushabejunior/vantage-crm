import api from './client';

export const getClients = () => api.get('/clients');
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const updateClientSector = (id, sector) => api.put(`/clients/${id}/sector`, { sector });
export const deleteClient = (id) => api.delete(`/clients/${id}`);
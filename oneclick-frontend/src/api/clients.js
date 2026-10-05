import api from './client';

export const getClients = () => api.get('/clients');
export const updateClientSector = (id, sector) => api.put(`/clients/${id}/sector`, { sector });
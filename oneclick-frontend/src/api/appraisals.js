import api from './client';

export const getAppraisals = () => api.get('/appraisals');
export const saveAppraisal = (data) => api.post('/appraisals', data);
export const deleteAppraisal = (id) => api.delete(`/appraisals/${id}`);
import api from './client';

export const getMeetings = () => api.get('/meetings');
export const createMeeting = (data) => api.post('/meetings', data);
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data);
export const updateMeetingStatus = (id, status) => api.patch(`/meetings/${id}/status`, { status });
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);
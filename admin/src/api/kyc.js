import api from './client';

export const kycApi = {
    getAllSubmissions: () => api.get('/admin/kyc/'),
    getSubmission: (id) => api.get(`/admin/kyc/${id}/`),
    approve: (id) => api.post(`/admin/kyc/${id}/approve/`),
    reject: (id, reason) => api.post(`/admin/kyc/${id}/reject/`, { reason }),
};

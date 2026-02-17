import apiClient from './client';

export const promosApi = {
    // Get all promo cards
    getPromos: async () => {
        const response = await apiClient.get('/admin/promos/');
        return response.data;
    },

    // Get promo card by ID
    getPromoById: async (id) => {
        const response = await apiClient.get(`/admin/promos/${id}/`);
        return response.data;
    },

    // Create promo card
    createPromo: async (data) => {
        const response = await apiClient.post('/admin/promos/', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Update promo card
    updatePromo: async (id, data) => {
        const response = await apiClient.patch(`/admin/promos/${id}/`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Delete promo card
    deletePromo: async (id) => {
        const response = await apiClient.delete(`/admin/promos/${id}/`);
        return response.data;
    },
};

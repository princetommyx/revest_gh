import apiClient from './client';

export const pickupsApi = {
    // Get all pickup requests
    getPickups: async (params = {}) => {
        const response = await apiClient.get('/logistics/pickups/', { params });
        return response.data;
    },

    // Get pickup by ID
    getPickupById: async (id) => {
        const response = await apiClient.get(`/logistics/pickups/${id}/`);
        return response.data;
    },
};

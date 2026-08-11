import apiClient from './client';

export const listingsApi = {
    // Get all listings
    getListings: async (params = {}) => {
        const response = await apiClient.get('/market/listings/', { params });
        return response.data;
    },

    // Get listing by ID
    getListingById: async (id) => {
        const response = await apiClient.get(`/market/listings/${id}/`);
        return response.data;
    },
};

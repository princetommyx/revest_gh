import apiClient from './client';

export const marketApi = {
    getListings: async (params = {}) => {
        // params: { page, material_type, search, min_price, max_price, ordering }
        const response = await apiClient.get('/market/listings/', { params });
        return response.data;
    },

    getListing: async (id) => {
        const response = await apiClient.get(`/market/listings/${id}/`);
        return response.data;
    },

    createListing: async (listingData) => {
        // listingData should be FormData if uploading image
        const response = await apiClient.post('/market/listings/', listingData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    updateListing: async (id, data) => {
        const response = await apiClient.patch(`/market/listings/${id}/`, data);
        return response.data;
    },

    deleteListing: async (id) => {
        await apiClient.delete(`/market/listings/${id}/`);
    },

    getMyListings: async () => {
        const response = await apiClient.get('/market/listings/my_listings/');
        return response.data;
    }
};

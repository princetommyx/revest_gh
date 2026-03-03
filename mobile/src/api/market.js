import apiClient from './client';

export const marketApi = {
    getListings: async (params = {}) => {
        // params: { page, material_type, search, min_price, max_price, ordering }
        const response = await apiClient.get('market/listings/', { params });
        return response.data;
    },

    getListing: async (id) => {
        const response = await apiClient.get(`market/listings/${id}/`);
        return response.data;
    },

    createListing: async (listingData) => {
        // listingData should be FormData if uploading image
        const response = await apiClient.post('market/listings/', listingData);
        return response.data;
    },

    updateListing: async (id, data) => {
        const response = await apiClient.patch(`market/listings/${id}/`, data);
        return response.data;
    },

    deleteListing: async (id) => {
        await apiClient.delete(`market/listings/${id}/`);
    },

    getMyListings: async () => {
        const response = await apiClient.get('market/listings/my_listings/');
        return response.data;
    },

    analyzeWaste: async (imageUri) => {
        const data = new FormData();
        let name = imageUri.split('/').pop();
        let match = /\.(\w+)$/.exec(name);

        // Fallback for missing extensions
        if (!match) {
            name += '.jpg';
            match = ['jpg', 'jpg'];
        }

        let type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : `image/jpeg`;

        const imageFile = { uri: imageUri, name, type };
        console.log('[analyzeWaste] Prepared image file:', imageFile);
        data.append('image', imageFile);

        try {
            const response = await apiClient.post('market/analyze-waste/', data, {
                timeout: 30000 // Increased timeout for AI
            });
            console.log('[analyzeWaste] Success!');
            return response.data;
        } catch (error) {
            console.error('[analyzeWaste] Network Error:', error.message);
            if (error.response) {
                console.error('[analyzeWaste] Response status:', error.response.status);
                console.error('[analyzeWaste] Response data:', error.response.data);
            }
            throw error;
        }
    }
};

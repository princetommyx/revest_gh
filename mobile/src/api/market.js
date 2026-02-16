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
        const response = await apiClient.post('market/listings/', listingData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            transformRequest: (data, headers) => {
                return data; // Axios workaround for FormData on React Native
            }
        });
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

        data.append('image', {
            uri: imageUri,
            name,
            type
        });

        const response = await apiClient.post('market/analyze-waste/', data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            transformRequest: (data) => data, // crucial for FormData
            timeout: 15000 // Give AI some time
        });
        return response.data;
    }
};

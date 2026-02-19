import apiClient from './client';

export const logisticsApi = {
    getPickupRequests: async (params = {}) => {
        const response = await apiClient.get('logistics/pickups/', { params });
        return response.data;
    },

    createPickupRequest: async (data) => {
        const response = await apiClient.post('logistics/pickups/', data);
        return response.data;
    },

    estimatePrice: async (coords) => {
        const response = await apiClient.post('logistics/pickups/estimate_price/', coords);
        return response.data;
    },

    getPickupDetails: async (id) => {
        const response = await apiClient.get(`logistics/pickups/${id}/`);
        return response.data;
    },

    acceptRequest: async (id) => {
        const response = await apiClient.post(`logistics/pickups/${id}/accept/`);
        return response.data;
    },

    updateStatus: async (id, status) => {
        // status: ARRIVED, COMPLETED, CANCELLED
        const actionMap = {
            ARRIVED: 'arrive',
            COMPLETED: 'complete',
            CANCELLED: 'cancel'
        };
        const action = actionMap[status];
        if (!action) throw new Error("Invalid status update");

        const response = await apiClient.post(`logistics/pickups/${id}/${action}/`);
        return response.data;
    },

    updateLocation: async (id, lat, lon) => {
        const response = await apiClient.post(`logistics/pickups/${id}/track/`, {
            latitude: lat,
            longitude: lon
        });
        return response.data;
    },

    cancelRequest: async (id, reason) => {
        const response = await apiClient.post(`logistics/pickups/${id}/cancel/`, {
            cancel_reason: reason
        });
        return response.data;
    },

    verifyWeight: async (id, formData) => {
        const response = await apiClient.post(`logistics/pickups/${id}/verify_weight/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            transformRequest: (data) => data,
        });
        return response.data;
    }
};

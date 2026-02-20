import apiClient from './client';

export const onboardingApi = {
    getScreens: async () => {
        const response = await apiClient.get('admin/onboarding/');
        return response.data;
    },

    getScreen: async (id) => {
        const response = await apiClient.get(`admin/onboarding/${id}/`);
        return response.data;
    },

    createScreen: async (data) => {
        const response = await apiClient.post('admin/onboarding/', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    },

    updateScreen: async (id, data) => {
        const response = await apiClient.patch(`admin/onboarding/${id}/`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    },

    deleteScreen: async (id) => {
        const response = await apiClient.delete(`admin/onboarding/${id}/`);
        return response.data;
    }
};

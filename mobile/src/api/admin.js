import apiClient from './client';

export const adminApi = {
    /**
     * Fetch active onboarding screens for the mobile app
     */
    getOnboardingScreens: async () => {
        try {
            const response = await apiClient.get('admin/onboarding/public/');
            return response.data;
        } catch (error) {
            console.error('Error fetching onboarding screens:', error);
            throw error;
        }
    },

    /**
     * Fetch active promo cards for the mobile app
     */
    getPromoCards: async (role = 'ALL') => {
        try {
            const response = await apiClient.get('admin/promos/public/', {
                params: { role }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching promo cards:', error);
            throw error;
        }
    },

    /**
     * Public system flags the app needs at runtime - right now just
     * whether monetization (pricing, fees, commission) is switched on.
     */
    getAppConfig: async () => {
        const response = await apiClient.get('admin/system/config/public/');
        return response.data;
    }
};

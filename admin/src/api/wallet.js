import apiClient from './client';

export const walletApi = {
    // Every transaction on the platform, paginated.
    //
    // This used to call /wallet/transactions/, which is the mobile app's
    // "my own history" route - it reads the signed-in user's wallet. An
    // admin has no wallet activity, so the page showed an empty table
    // however much money had moved, and that route is unpaginated anyway.
    getTransactions: async (params = {}) => {
        const response = await apiClient.get('/admin/transactions/', { params });
        return response.data;
    },

    // Get wallet details
    getWallet: async () => {
        const response = await apiClient.get('/wallet/me/');
        return response.data;
    },
};

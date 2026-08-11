import apiClient from './client';

export const walletApi = {
    // Get all transactions
    getTransactions: async (params = {}) => {
        const response = await apiClient.get('/wallet/transactions/', { params });
        return response.data;
    },

    // Get wallet details
    getWallet: async () => {
        const response = await apiClient.get('/wallet/me/');
        return response.data;
    },
};

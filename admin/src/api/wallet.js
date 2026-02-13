import apiClient from './client';

export const walletApi = {
    // Get all transactions
    getTransactions: async (params = {}) => {
        const response = await apiClient.get('/wallet/transactions/', { params });
        return response.data;
    },
};

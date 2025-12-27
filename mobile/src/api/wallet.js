import apiClient from './client';

export const walletApi = {
    getWallet: async () => {
        const response = await apiClient.get('/wallet/me/');
        return response.data;
    },

    getTransactions: async () => {
        const response = await apiClient.get('/wallet/transactions/');
        return response.data;
    },

    deposit: async (amount, description) => {
        const response = await apiClient.post('/wallet/deposit/', { amount, description });
        return response.data;
    },

    withdraw: async (amount, description) => {
        const response = await apiClient.post('/wallet/withdraw/', { amount, description });
        return response.data;
    }
};

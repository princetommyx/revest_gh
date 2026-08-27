import apiClient from './client';

export const walletApi = {
    getWallet: async () => {
        const response = await apiClient.get('wallet/');
        return Array.isArray(response.data) ? response.data[0] : response.data;
    },

    deposit: async (data) => {
        // data: { amount, phone_number, network }
        const response = await apiClient.post('wallet/deposit/', data);
        return response.data;
    },

    verifyPayment: async (reference) => {
        const response = await apiClient.post('wallet/verify_payment/', { reference });
        return response.data;
    },

    withdraw: async (data) => {
        // data: { amount, phone_number, network, account_name }
        const response = await apiClient.post('wallet/withdraw/', data);
        return response.data;
    },

    getTransactions: async () => {
        const response = await apiClient.get('wallet/transactions/');
        return response.data;
    },

    initializePayment: async (email, amount) => {
        const response = await apiClient.post('wallet/initialize_payment/', { email, amount });
        return response.data;
    }
};

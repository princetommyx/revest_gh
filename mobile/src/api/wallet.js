import apiClient from './client';

export const walletApi = {
    getWallet: async () => {
        // 'wallet/' is the ViewSet's list route, and DRF pagination is on
        // globally - so it returns {count, next, previous, results:[...]} and
        // the unwrapping below never fired, leaving balance/recent_transactions
        // undefined and every screen showing 0.00. 'wallet/me/' is a custom
        // action that returns the single wallet object unpaginated.
        const response = await apiClient.get('wallet/me/');
        const data = response.data;
        if (Array.isArray(data)) return data[0];
        if (data && Array.isArray(data.results)) return data.results[0];
        return data;
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

import apiClient from '../api/client';

/**
 * Service to handle Backend-Led Phone Verification
 */
export const PhoneAuth = {
    /**
     * Sends a verification code via backend.
     * @param {string} phoneNumber - The phone number
     */
    signInWithPhoneNumber: async (phoneNumber) => {
        try {
            const response = await apiClient.post('auth/phone/send-otp/', {
                phone_number: phoneNumber
            });
            return response.data; // Returning data for consistency
        } catch (error) {
            console.error("Backend Phone Auth Error:", error);
            const msg = error.response?.data?.error || error.message;
            throw new Error(msg);
        }
    },

    /**
     * Confirms the verification code via backend.
     * @param {string} phoneNumber - The phone number
     * @param {string} code - The 6-digit SMS code
     */
    confirmCode: async (phoneNumber, code) => {
        try {
            const response = await apiClient.post('auth/phone/verify-otp/', {
                phone_number: phoneNumber,
                otp: code
            });
            return response.data;
        } catch (error) {
            console.error("Backend Code Confirmation Error:", error);
            const msg = error.response?.data?.error || error.message;
            throw new Error(msg);
        }
    },

    signOut: async () => {
        // No-op for backend-led verification
    }
};

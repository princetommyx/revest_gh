import apiClient from './client';

// Mirrors moderation.models.Report.Reason on the backend. Keep in sync -
// the backend validates against these exact values.
export const REPORT_REASONS = [
    { id: 'SPAM', label: 'Spam or misleading' },
    { id: 'HARASSMENT', label: 'Harassment or hate speech' },
    { id: 'SCAM', label: 'Scam or fraud' },
    { id: 'INAPPROPRIATE', label: 'Inappropriate or explicit content' },
    { id: 'SAFETY', label: 'Unsafe or dangerous behaviour' },
    { id: 'OTHER', label: 'Something else' },
];

export const moderationApi = {
    blockUser: async (userId) => {
        const response = await apiClient.post('moderation/block/', { user_id: userId });
        return response.data;
    },

    unblockUser: async (userId) => {
        const response = await apiClient.delete(`moderation/block/${userId}/`);
        return response.data;
    },

    getBlockedUsers: async () => {
        const response = await apiClient.get('moderation/blocked/');
        const data = response.data;
        // Pagination is on globally, so tolerate either shape.
        return Array.isArray(data) ? data : (data?.results || []);
    },

    // targetType: 'USER' | 'LISTING' | 'MESSAGE'
    report: async ({ targetType, targetId, reason, details }) => {
        const response = await apiClient.post('moderation/reports/', {
            target_type: targetType,
            target_id: targetId,
            reason,
            details: details || '',
        });
        return response.data;
    },

    getMyReports: async () => {
        const response = await apiClient.get('moderation/reports/');
        const data = response.data;
        return Array.isArray(data) ? data : (data?.results || []);
    },
};

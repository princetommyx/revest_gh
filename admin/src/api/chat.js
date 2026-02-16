import apiClient from './client';

export const chatApi = {
    // Send message to a user
    sendMessage: async (receiverId, content) => {
        const response = await apiClient.post('/chat/messages/', {
            receiver: receiverId,
            content: content
        });
        return response.data;
    },

    // Get messages with a specific user (for future enhancement)
    getMessagesWithUser: async (userId) => {
        const response = await apiClient.get(`/chat/messages/with/${userId}/`);
        return response.data;
    },

    // Get conversations list (for future enhancement)
    getConversations: async () => {
        const response = await apiClient.get('/chat/messages/conversations/');
        return response.data;
    },

    // Get support sessions
    getSupportSessions: async () => {
        const response = await apiClient.get('/chat/support-sessions/');
        return response.data;
    },

    // Get support session details
    getSupportSession: async (id) => {
        const response = await apiClient.get(`/chat/support-sessions/${id}/`);
        return response.data;
    },

    // Claim a support session
    claimSession: async (id) => {
        const response = await apiClient.post(`/chat/support-sessions/${id}/claim/`);
        return response.data;
    },

    // Resolve a support session
    resolveSession: async (id) => {
        const response = await apiClient.post(`/chat/support-sessions/${id}/resolve/`);
        return response.data;
    },
};

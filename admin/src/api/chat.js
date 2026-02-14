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
};

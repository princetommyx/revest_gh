import apiClient from './client';

export const chatApi = {
    getConversations: async () => {
        const response = await apiClient.get('/chat/messages/conversations/');
        return response.data;
    },

    getMessages: async (userId) => {
        const response = await apiClient.get(`/chat/messages/with/${userId}/`);
        return response.data;
    },

    sendMessage: async (receiverId, content) => {
        const response = await apiClient.post('/chat/messages/', {
            receiver: receiverId,
            content
        });
        return response.data;
    }
};

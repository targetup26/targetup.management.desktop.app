const axios = require('axios');

const API_BASE_URL = 'http://192.168.100.54:3001/api';

class ChatService {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000
        });
    }

    getToken() {
        return localStorage.getItem('token');
    }

    getHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async getRooms() {
        try {
            const response = await this.client.get('/chat/rooms', {
                headers: this.getHeaders()
            });
            return response.data.rooms;
        } catch (error) {
            console.error('getRooms error:', error);
            throw new Error(error.response?.data?.error || 'Network error fetching rooms');
        }
    }

    async getMessages(roomId, limit = 50, before = null) {
        try {
            let url = `/chat/rooms/${roomId}/messages?limit=${limit}`;
            if (before) url += `&before=${before}`;

            const response = await this.client.get(url, {
                headers: this.getHeaders()
            });
            return response.data.messages;
        } catch (error) {
            console.error('getMessages error:', error);
            throw new Error(error.response?.data?.error || 'Network error fetching messages');
        }
    }

    async sendMessage(roomId, content, fileIds = []) {
        try {
            const response = await this.client.post('/chat/messages', {
                room_id: roomId,
                content,
                file_ids: fileIds
            }, {
                headers: this.getHeaders()
            });
            return response.data.message;
        } catch (error) {
            console.error('sendMessage error:', error);
            throw new Error(error.response?.data?.error || 'Transmission failed');
        }
    }

    async getDirectory() {
        try {
            const response = await this.client.get('/users', {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getDirectory error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch directory');
        }
    }

    async startDM(recipientId, content) {
        try {
            const response = await this.client.post('/chat/messages', {
                recipient_id: recipientId,
                content
            }, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('startDM error:', error);
            throw new Error(error.response?.data?.error || 'Failed to initiate DM');
        }
    }

    async getProfile() {
        try {
            const response = await this.client.get('/profile', {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getProfile error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch profile');
        }
    }

    async getUserProfile(userId) {
        try {
            const response = await this.client.get(`/profile/${userId}`, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getUserProfile error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch colleague profile');
        }
    }

    async updateProfile(data) {
        try {
            const response = await this.client.put('/profile', data, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('updateProfile error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update profile');
        }
    }

    async updatePresence(data) {
        try {
            const response = await this.client.put('/profile/presence', data, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('updatePresence error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update presence');
        }
    }

    async updateSettings(data) {
        try {
            const response = await this.client.put('/profile/settings', data, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('updateSettings error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update settings');
        }
    }

    async updateRoom(roomId, data) {
        try {
            const response = await this.client.put(`/admin/chat/rooms/${roomId}`, data, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('updateRoom error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update room');
        }
    }

    async getNotes() {
        try {
            const response = await this.client.get('/notes', {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getNotes error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch notes');
        }
    }

    async createNote(content) {
        try {
            const response = await this.client.post('/notes', { content }, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('createNote error:', error);
            throw new Error(error.response?.data?.error || 'Failed to create note');
        }
    }

    async updateNote(id, data) {
        try {
            const response = await this.client.put(`/notes/${id}`, data, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('updateNote error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update note');
        }
    }

    async deleteNote(id) {
        try {
            const response = await this.client.delete(`/notes/${id}`, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('deleteNote error:', error);
            throw new Error(error.response?.data?.error || 'Failed to delete note');
        }
    }

    async search(query) {
        try {
            const response = await this.client.get(`/search?q=${encodeURIComponent(query)}`, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Search error:', error);
            throw new Error(error.response?.data?.error || 'Search failed');
        }
    }

    async editMessage(messageId, content) {
        try {
            const response = await this.client.put(`/chat/messages/${messageId}`, { content }, {
                headers: this.getHeaders()
            });
            return response.data.message;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Edit failed');
        }
    }

    async deleteMessage(messageId) {
        try {
            await this.client.delete(`/chat/messages/${messageId}`, {
                headers: this.getHeaders()
            });
            return true;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Delete failed');
        }
    }

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('is_chat', 'true');

            const response = await this.client.post('/storage/upload', formData, {
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data.file;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Upload failed');
        }
    }

    async getServerHealth() {
        try {
            const response = await this.client.get('/storage/health', {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getServerHealth error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch storage health');
        }
    }

    async getConfig() {
        try {
            const response = await this.client.get('/config', {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('getConfig error:', error);
            return {
                success: false,
                config: {
                    chat: {
                        messageGroupingThresholdSeconds: 300,
                        maxMessageLength: 2000
                    }
                }
            };
        }
    }

    getStorageUrl(fileId) {
        if (!fileId) return null;
        const id = typeof fileId === 'object' ? (fileId.id || fileId) : fileId;
        if (!id || id === 'null') return null;

        // If it's already a full URL, just return it (or append token if it matches our API)
        if (typeof id === 'string' && id.startsWith('http')) {
            if (id.includes(API_BASE_URL)) {
                const connector = id.includes('?') ? '&' : '?';
                return `${id}${connector}token=${this.getToken()}`;
            }
            return id;
        }

        return `${API_BASE_URL}/storage/download/${id}?token=${this.getToken()}`;
    }
}

module.exports = new ChatService();

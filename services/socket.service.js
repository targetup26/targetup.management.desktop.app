/**
 * Socket Service - WebSocket management for real-time chat
 * Uses Socket.IO client with JWT authentication
 */

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.isConnected = false;
        this.serverURL = 'http://localhost:5050';
        this.loadConfig();
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.API_BASE_URL) {
                    this.serverURL = config.API_BASE_URL.replace(/\/$/, '');
                    console.log(`[SocketService] Loaded serverURL from config.json: ${this.serverURL}`);
                }
            }
        } catch (error) {
            console.error('[SocketService] Failed to load config.json:', error);
        }
    }

    /**
     * Connect to Socket.IO server with JWT token
     * REUSE: Existing JWT token from localStorage
     */
    connect() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found for socket connection');
            return;
        }

        this.socket = io(this.serverURL, {
            auth: { token },
            transports: ['polling', 'websocket']
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected');
            this.isConnected = true;
            this.emit('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            this.emit('error', error);
        });

        // Real-time message events
        this.socket.on('new_message', (data) => {
            this.emit('message', data);
        });

        this.socket.on('message_edited', (data) => {
            this.emit('message_edited', data);
        });

        this.socket.on('message_deleted', (data) => {
            this.emit('message_deleted', data);
        });

        // Typing indicators
        this.socket.on('user_typing', (data) => {
            this.emit('typing', data);
        });

        this.socket.on('user_stopped_typing', (data) => {
            this.emit('typing_stop', data);
        });

        // User presence
        this.socket.on('user_online', (data) => {
            this.emit('presence', { ...data, status: 'online' });
        });

        this.socket.on('user_offline', (data) => {
            this.emit('presence', { ...data, status: 'offline' });
        });

        // Form updates
        this.socket.on('form_updated', (data) => {
            this.emit('form_updated', data);
        });

        // Policy updates
        this.socket.on('policies_updated', (data) => {
            this.emit('policies_updated', data);
        });
    }

    /**
     * Join user's accessible rooms
     * Verifies access on server side
     */
    joinRooms(roomIds) {
        if (!this.isConnected) {
            console.error('Socket not connected');
            return;
        }
        this.socket.emit('join_rooms', roomIds);
    }

    /**
     * Send typing indicator
     */
    sendTyping(roomId) {
        if (!this.isConnected) return;
        this.socket.emit('typing_start', { room_id: roomId });
    }

    /**
     * Stop typing indicator
     */
    stopTyping(roomId) {
        if (!this.isConnected) return;
        this.socket.emit('typing_stop', { room_id: roomId });
    }

    /**
     * Register event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event to local listeners
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }

    /**
     * Disconnect socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }
}

// Export singleton instance
const socketService = new SocketService();
module.exports = socketService;

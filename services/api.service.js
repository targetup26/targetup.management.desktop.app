const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:3001/api';
        this.loadConfig();
        this.token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        this.maxRetries = 3;
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.API_BASE_URL) {
                    this.baseURL = `${config.API_BASE_URL}/api`;
                    console.log(`[ApiService] Loaded baseURL: ${this.baseURL}`);
                }
            }
        } catch (error) {
            console.error('[ApiService] Failed to load config.json:', error);
        }
    }

    setToken(token) {
        this.token = token;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    getHeaders() {
        // Ensure token is fresh
        if (typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('token');
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async request(method, endpoint, data = null, retries = 0) {
        console.log(`[ApiService] Request: ${method} ${endpoint}, token present: ${!!this.token}`);
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: this.getHeaders()
            };

            if (this.token) {
                console.log(`[ApiService] Using Token: ${this.token.substring(0, 10)}...`);
            }

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            // Handle auth errors
            if (error.response?.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired. Please login again.');
            }

            if (error.response?.status === 403) {
                throw new Error(error.response.data?.error || 'Access denied by security policy.');
            }

            // Retry on network errors
            if (!error.response && retries < this.maxRetries) {
                console.log(`Network error, retrying... (${retries + 1}/${this.maxRetries})`);
                await this.delay(1000 * (retries + 1));
                return this.request(method, endpoint, data, retries + 1);
            }

            throw new Error(error.response?.data?.error || error.message || 'Network error');
        }
    }

    // Shorthand methods for backward compatibility
    async get(endpoint, data = null) {
        return this.request('GET', endpoint, data);
    }

    async post(endpoint, data = null) {
        return this.request('POST', endpoint, data);
    }

    async put(endpoint, data = null) {
        return this.request('PUT', endpoint, data);
    }

    async delete(endpoint, data = null) {
        return this.request('DELETE', endpoint, data);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // API Methods
    async login(username, password) {
        const response = await this.request('POST', '/auth/login', { username, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async getAttendanceStatus() {
        return await this.request('GET', '/attendance/status');
    }

    async getProfile() {
        return await this.request('GET', '/profile');
    }

    async registerDevice(deviceInfo) {
        return await this.request('POST', '/devices/register', deviceInfo);
    }

    async checkIn(deviceFingerprint, ipAddress) {
        return await this.request('POST', '/attendance/check-in', {
            device_fingerprint: deviceFingerprint,
            ip_address: ipAddress,
            source: 'DESKTOP_APP'
        });
    }

    async checkOut(deviceFingerprint, ipAddress) {
        return await this.request('POST', '/attendance/check-out', {
            device_fingerprint: deviceFingerprint,
            ip_address: ipAddress,
            source: 'DESKTOP_APP'
        });
    }

    async sendHeartbeat(deviceFingerprint, ipAddress) {
        return await this.request('POST', '/attendance/heartbeat', {
            device_fingerprint: deviceFingerprint,
            ip_address: ipAddress,
            active: true
        });
    }

    async getHeartbeat(deviceFingerprint, ipAddress) {
        return await this.request('POST', '/attendance/heartbeat', {
            device_fingerprint: deviceFingerprint,
            ip_address: ipAddress
        });
    }

    async getActiveBreaks() {
        return await this.request('GET', '/breaks/active');
    }

    async startBreak() {
        return await this.request('POST', '/breaks/start');
    }

    async endBreak() {
        return await this.request('POST', '/breaks/end');
    }

    getStorageUrl(fileId) {
        if (!fileId) return null;
        const id = typeof fileId === 'object' ? (fileId.id || fileId) : fileId;
        if (!id || id === 'null') return null;

        if (typeof id === 'string' && id.startsWith('http')) {
            if (id.includes(this.baseURL)) {
                const connector = id.includes('?') ? '&' : '?';
                return `${id}${connector}token=${this.token}`;
            }
            return id;
        }

        return `${this.baseURL}/storage/download/${id}?token=${this.token}`;
    }
}

module.exports = new ApiService();

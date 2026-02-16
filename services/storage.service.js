const axios = require('axios');
const apiService = require('./api.service');

class StorageService {
    constructor() {
        this.baseURL = apiService.baseURL;
    }

    async getFiles() {
        return await apiService.request('GET', '/storage/files');
    }

    async uploadFile(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        // Use current user info from localStorage if available
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.employee_id) formData.append('employee_id', user.employee_id);
            if (user.department_id) formData.append('department_id', user.department_id);
        }

        const config = {
            method: 'POST',
            url: `${this.baseURL}/storage/upload`,
            headers: {
                ...apiService.getHeaders(),
                'Content-Type': 'multipart/form-data'
            },
            data: formData,
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            }
        };

        const response = await axios(config);
        return response.data;
    }

    async deleteFile(id) {
        return await apiService.request('DELETE', `/storage/${id}`);
    }

    getDownloadUrl(fileId) {
        return apiService.getStorageUrl(fileId);
    }
}

module.exports = new StorageService();

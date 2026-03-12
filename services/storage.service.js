const axios = require('axios');
const apiService = require('./api.service');

class StorageService {
    constructor() {
        this.baseURL = apiService.baseURL;
    }

    // Helper: get stored user data with all fields
    _getUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : {};
        } catch { return {}; }
    }

    // Helper: get department_id — checks multiple possible locations in stored data
    _getDeptId(user) {
        return user.department_id
            || user.Employee?.department_id
            || user.employee?.department_id
            || null;
    }

    // Get files/folders in a specific folder (or root if no folderId)
    async getFiles(folderId = null) {
        const params = new URLSearchParams();
        const user = this._getUser();
        if (user.employee_id) params.append('employee_id', user.employee_id);
        const deptId = this._getDeptId(user);
        if (deptId) params.append('department_id', deptId);
        if (folderId) params.append('folder_id', folderId);
        return await apiService.request('GET', `/storage/files?${params.toString()}`);
    }

    // Create a new folder — fetches profile if department_id missing
    async createFolder(name, parentFolderId = null) {
        const user = this._getUser();
        let deptId = this._getDeptId(user);
        let empId = user.employee_id || null;

        // If still no department_id, fetch from /profile
        if (!deptId) {
            try {
                const profile = await apiService.request('GET', '/profile');
                // /profile returns: { employee: { id, department_id, ... } }
                const emp = profile?.employee || profile?.user?.employee;
                deptId = emp?.department_id || null;
                empId  = empId || emp?.id || null;
                // Cache for future calls
                if (deptId || empId) {
                    user.department_id = deptId;
                    user.employee_id   = empId;
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (e) {
                console.warn('[createFolder] Could not fetch profile:', e.message);
            }
        }

        if (!deptId) {
            throw new Error('Cannot create folder: department_id not found. Contact admin.');
        }

        return await apiService.request('POST', '/storage/folders', {
            name,
            folder_id: parentFolderId || null,
            employee_id: empId,
            department_id: deptId
        });
    }

    // Upload file to a specific folder
    async uploadFile(file, onProgress, folderId = null) {
        const formData = new FormData();
        formData.append('file', file);

        const user = this._getUser();
        const deptId = this._getDeptId(user);
        if (user.employee_id) formData.append('employee_id', user.employee_id);
        if (deptId) formData.append('department_id', deptId);
        if (folderId) formData.append('folder_id', folderId);

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

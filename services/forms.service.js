const apiService = require('./api.service');

class FormsService {
    constructor() {
        this.baseUrl = '/forms';
    }

    /**
     * Get all available form templates
     */
    async getTemplates() {
        try {
            const response = await apiService.request('GET', `${this.baseUrl}/templates`);
            return response.templates;
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    /**
     * Get single template with schema
     */
    async getTemplate(id) {
        try {
            const response = await apiService.request('GET', `${this.baseUrl}/templates/${id}`);
            return response.template;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    /**
     * Get field options for dropdown/checkbox
     */
    async getFieldOptions(templateId, fieldName) {
        try {
            const response = await apiService.request('GET', `${this.baseUrl}/templates/${templateId}/options/${fieldName}`);
            return response.options;
        } catch (error) {
            console.error('Error fetching field options:', error);
            throw error;
        }
    }

    /**
     * Submit form
     */
    async submitForm(templateId, formData, draftId = null) {
        try {
            const response = await apiService.request('POST', `${this.baseUrl}/submit`, {
                template_id: templateId,
                form_data: formData,
                draft_id: draftId
            });
            return response.submission;
        } catch (error) {
            console.error('Error submitting form:', error);
            throw error;
        }
    }

    /**
     * Save draft (autosave)
     */
    async saveDraft(templateId, formData, draftId = null) {
        try {
            const response = await apiService.request('PUT', `${this.baseUrl}/drafts/${draftId || 'new'}`, {
                template_id: templateId,
                form_data: formData,
                draft_id: draftId
            });
            return response.draft;
        } catch (error) {
            console.error('Error saving draft:', error);
            throw error;
        }
    }

    /**
     * Get my submissions
     */
    async getMySubmissions() {
        try {
            const response = await apiService.request('GET', `${this.baseUrl}/my-submissions`);
            return response.submissions;
        } catch (error) {
            console.error('Error fetching submissions:', error);
            throw error;
        }
    }

    /**
     * Get submission details
     */
    async getSubmission(id) {
        try {
            const response = await apiService.request('GET', `${this.baseUrl}/submissions/${id}`);
            return response.submission;
        } catch (error) {
            console.error('Error fetching submission:', error);
            throw error;
        }
    }

    /**
     * Sign form (digital signature)
     */
    async signForm(submissionId, comments = '') {
        try {
            const response = await apiService.request('POST', `${this.baseUrl}/submissions/${submissionId}/sign`, {
                comments
            });
            return response;
        } catch (error) {
            console.error('Error signing form:', error);
            throw error;
        }
    }

    getDownloadUrl(fileId) {
        return apiService.getStorageUrl(fileId);
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            draft: '<span class="status-badge draft">📝 Draft</span>',
            submitted: '<span class="status-badge submitted">📤 Submitted</span>',
            pending: '<span class="status-badge pending">⏳ Pending</span>',
            returned_for_edit: '<span class="status-badge returned">↩️ Returned</span>',
            approved: '<span class="status-badge approved">✅ Approved</span>',
            rejected: '<span class="status-badge rejected">❌ Rejected</span>',
            cancelled: '<span class="status-badge cancelled">🚫 Cancelled</span>',
            archived: '<span class="status-badge archived">📦 Archived</span>'
        };
        return badges[status] || status;
    }

    /**
     * Get leave balance
     */
    async getLeaveBalance() {
        try {
            const response = await apiService.request('GET', `/attendance/balance`);
            return response;
        } catch (error) {
            console.error('Error fetching leave balance:', error);
            throw error;
        }
    }
}

module.exports = new FormsService();

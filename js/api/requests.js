/**
 * Swan Turbines Foundation — Help Request API Service
 */
import { request } from './client.js';

export const RequestApi = {
    /**
     * Submit a new help request
     * @param {Object} data - Request payload
     */
    async submitRequest(data) {
        return request('/api/v1/requests', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Track a request status by reference code
     * @param {string} referenceNumber - e.g. STF-2026-000001
     */
    async trackRequest(referenceNumber) {
        return request(`/api/v1/requests/track/${encodeURIComponent(referenceNumber)}`);
    },

    /**
     * Upload supporting document for a request
     * @param {string} requestId
     * @param {File} file
     */
    async uploadDocument(requestId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return request(`/api/v1/requests/${encodeURIComponent(requestId)}/documents`, {
            method: 'POST',
            body: formData
        });
    },

    /**
     * Admin: List help requests
     */
    async listRequests(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        if (params.urgency) searchParams.append('urgency', params.urgency);
        if (params.support_type) searchParams.append('support_type', params.support_type);
        if (params.search) searchParams.append('search', params.search);
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));

        const query = searchParams.toString();
        return request(`/api/v1/requests${query ? `?${query}` : ''}`);
    },

    /**
     * Admin: Get request details
     */
    async getRequest(id) {
        return request(`/api/v1/requests/${encodeURIComponent(id)}`);
    },

    /**
     * Admin: Update request status
     */
    async updateStatus(id, newStatus, reason = '') {
        return request(`/api/v1/requests/${encodeURIComponent(id)}/status`, {
            method: 'PATCH',
            body: { status: newStatus, reason }
        });
    },

    /**
     * Admin: Add internal note
     */
    async addNote(id, note) {
        return request(`/api/v1/requests/${encodeURIComponent(id)}/notes`, {
            method: 'POST',
            body: { note }
        });
    }
};

/**
 * Swan Turbines Foundation — Campaign API Service
 */
import { request } from './client.js';

export const CampaignApi = {
    /**
     * Get paginated list of campaigns
     * @param {Object} params - Query params (status, category, featured, page, limit)
     */
    async getCampaigns(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        if (params.category) searchParams.append('category', params.category);
        if (params.featured !== undefined) searchParams.append('featured', String(params.featured));
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));

        const query = searchParams.toString();
        return request(`/api/v1/campaigns${query ? `?${query}` : ''}`);
    },

    /**
     * Get a single campaign by slug or ID
     */
    async getCampaign(idOrSlug) {
        return request(`/api/v1/campaigns/${encodeURIComponent(idOrSlug)}`);
    },

    /**
     * Create a campaign (Admin)
     */
    async createCampaign(data) {
        return request('/api/v1/campaigns', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Update a campaign (Admin)
     */
    async updateCampaign(id, data) {
        return request(`/api/v1/campaigns/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Delete/archive a campaign (Admin)
     */
    async deleteCampaign(id) {
        return request(`/api/v1/campaigns/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }
};

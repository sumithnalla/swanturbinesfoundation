/**
 * Swan Turbines Foundation — Contact API Service
 */
import { request } from './client.js';

export const ContactApi = {
    /**
     * Submit contact form
     * @param {Object} data - { first_name, last_name, email, phone, subject, message }
     */
    async submit(data) {
        return request('/api/v1/contact', {
            method: 'POST',
            body: data
        });
    }
};

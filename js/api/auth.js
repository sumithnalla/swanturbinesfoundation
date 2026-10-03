/**
 * Swan Turbines Foundation — Authentication API Service
 */
import { request } from './client.js';

export const AuthApi = {
    /**
     * Admin login with email & password
     * On success, server sets an HTTP-only secure cookie
     */
    async login(email, password) {
        return request('/api/v1/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    },

    /**
     * Logout and invalidate session cookie
     */
    async logout() {
        return request('/api/v1/auth/logout', {
            method: 'POST'
        });
    },

    /**
     * Get current authenticated user profile
     */
    async getMe() {
        return request('/api/v1/auth/me');
    }
};

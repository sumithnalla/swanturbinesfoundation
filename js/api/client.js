/**
 * Swan Turbines Foundation — API Client Core
 * Centralized HTTP request handling with error normalization and credentials support.
 */

// Override this at deployment time if a proxy/custom API domain is introduced.
const API_BASE_URL = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';

class ApiError extends Error {
    constructor(message, status, code, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/**
 * Base request function
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        ...(options.headers || {})
    };
    const token = window.localStorage.getItem('swan_admin_token');
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

    // If body is an object and not FormData, stringify it and set JSON header
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const config = {
        ...options,
        headers,
        body,
        credentials: 'include' // Always send cookies for auth
    };

    try {
        const response = await fetch(url, config);

        // Parse response
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const errorCode = data && data.error && data.error.code ? data.error.code : `HTTP_${response.status}`;
            const errorMessage = data && data.error && data.error.message ? data.error.message : (typeof data === 'string' ? data : response.statusText);
            throw new ApiError(errorMessage, response.status, errorCode, data);
        }

        return data;
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        // Network or parsing error
        throw new ApiError(err.message || 'Network request failed', 0, 'NETWORK_ERROR');
    }
}

export { API_BASE_URL, ApiError, request };

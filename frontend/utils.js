/**
 * QommerceHub Shared Frontend Utilities
 * Centralized utilities for authentication, API calls, and DOM helpers
 */

// ============================================
// Authentication Utilities
// ============================================

/**
 * Get authentication data from localStorage
 * @returns {{ token: string|null, tenant: object }}
 */
function getAuthData() {
    const token = localStorage.getItem('token');
    let tenant = {};
    try {
        tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    } catch (e) {
        console.error('Failed to parse tenant data:', e);
        localStorage.removeItem('tenant');
    }
    return { token, tenant };
}

/**
 * Check if user is authenticated, redirect to login if not
 * @returns {{ token: string, tenant: object }} Authentication data
 */
function requireAuth() {
    const { token, tenant } = getAuthData();
    if (!token) {
        window.location.href = 'login.html';
    }
    return { token, tenant };
}

/**
 * Handle user logout - clears session and redirects to login
 */
async function handleLogout() {
    const { token } = getAuthData();
    const API_URL = window.API_URL || 'http://localhost:5000';

    try {
        await fetch(`${API_URL}/api/tenants/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Logout API error:', error);
    }
    localStorage.clear();
    window.location.href = 'login.html';
}

// ============================================
// API Utilities
// ============================================

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/inventory')
 * @param {object} options - Fetch options
 * @returns {Promise<Response|null>} Response or null if unauthorized
 */
async function apiRequest(endpoint, options = {}) {
    const { token } = getAuthData();
    const API_URL = window.API_URL || 'http://localhost:5000';

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });

    if (response.status === 401) {
        handleLogout();
        return null;
    }

    return response;
}

// ============================================
// DOM Utilities
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Whether button is loading
 * @param {string} loadingText - Text to show while loading (default: 'Loading...')
 * @returns {string} Original button text (for restoration)
 */
function setButtonLoading(button, loading, loadingText = 'Loading...') {
    if (loading) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner"></span> ${loadingText}`;
        button.dataset.originalText = originalText;
        return originalText;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        return button.innerHTML;
    }
}

/**
 * Render pagination controls
 * @param {object} pagination - Pagination data { page, totalPages }
 * @param {string} containerId - ID of pagination container element
 * @param {function} onPageChange - Callback function for page change
 */
function renderPagination(pagination, containerId = 'pagination', onPageChange = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    // Default page change handler uses global changePage function
    const pageChangeHandler = onPageChange ? onPageChange.name : 'changePage';

    container.innerHTML = `
        <button onclick="${pageChangeHandler}(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${totalPages}</span>
        <button onclick="${pageChangeHandler}(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
    `;
}

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Format date string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Make functions globally available
window.getAuthData = getAuthData;
window.requireAuth = requireAuth;
window.handleLogout = handleLogout;
window.apiRequest = apiRequest;
window.escapeHtml = escapeHtml;
window.setButtonLoading = setButtonLoading;
window.renderPagination = renderPagination;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

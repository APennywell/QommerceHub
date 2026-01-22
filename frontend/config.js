// Frontend Configuration
// Auto-detects environment - no manual updates needed for deployment

(function() {
    // Auto-detect API URL based on current environment
    function getApiUrl() {
        const hostname = window.location.hostname;

        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }

        // Production - use same origin (Render serves frontend from backend)
        return window.location.origin;
    }

    window.APP_CONFIG = {
        // API URL - auto-detected
        API_URL: getApiUrl(),

        // Stripe Publishable Key
        // Get your key from: https://dashboard.stripe.com/apikeys
        // Use pk_test_... for testing, pk_live_... for production
        STRIPE_PUBLISHABLE_KEY: 'pk_test_51QfTESKxSqcyAJGqzSQdG0aCBDhXCAkFysmFeIHDNmtKwj1qAnkgHJlKHj17wLrUu79Qbp6N1NyiSeDO1U30XT6700cI2YqCwW'
    };

    // Make config available globally
    window.API_URL = window.APP_CONFIG.API_URL;
    window.STRIPE_PUBLISHABLE_KEY = window.APP_CONFIG.STRIPE_PUBLISHABLE_KEY;
})();

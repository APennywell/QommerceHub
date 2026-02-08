// Frontend Configuration
// Auto-detects environment - no manual updates needed for deployment

(function() {
    // Auto-detect API URL based on current environment
    // Since the frontend is served by the same Express server,
    // window.location.origin always gives us the correct URL and port.
    function getApiUrl() {
        return window.location.origin;
    }

    window.APP_CONFIG = {
        // API URL - auto-detected
        API_URL: getApiUrl(),

        // Stripe Publishable Key - loaded from backend
        STRIPE_PUBLISHABLE_KEY: null
    };

    // Make config available globally
    window.API_URL = window.APP_CONFIG.API_URL;
    window.STRIPE_PUBLISHABLE_KEY = null;

    // Fetch public config from backend (non-blocking)
    async function loadPublicConfig() {
        try {
            const response = await fetch(`${window.API_URL}/api/config/public`);
            if (response.ok) {
                const config = await response.json();
                if (config.stripePublishableKey) {
                    window.APP_CONFIG.STRIPE_PUBLISHABLE_KEY = config.stripePublishableKey;
                    window.STRIPE_PUBLISHABLE_KEY = config.stripePublishableKey;
                }
            }
        } catch (error) {
            console.error('Failed to load public config:', error);
        }
    }

    // Load config immediately
    loadPublicConfig();

    // Also expose the loader function for pages that need to wait
    window.loadPublicConfig = loadPublicConfig;
})();

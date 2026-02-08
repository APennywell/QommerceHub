// Theme Loader - Loads and applies custom theme on page load
// Set API_URL globally so other scripts can use it without redeclaring
// NOTE: Do NOT use 'const API_URL' here - it would conflict with page-specific JS files
window.API_URL = window.API_URL || window.location.origin;

// Default theme values
const DEFAULT_THEME = {
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: '#10b981',
    text_color: '#111827',
    background_color: '#f9fafb',
    background_image_url: null,
    logo_url: null,
    animations_enabled: true
};

/**
 * Apply theme to the document
 */
function applyTheme(theme) {
    const root = document.documentElement;

    // Apply colors as CSS custom properties
    root.style.setProperty('--primary', theme.primary_color || DEFAULT_THEME.primary_color);
    root.style.setProperty('--primary-dark', adjustColor(theme.primary_color || DEFAULT_THEME.primary_color, -20));
    root.style.setProperty('--secondary', theme.secondary_color || DEFAULT_THEME.secondary_color);
    root.style.setProperty('--accent', theme.accent_color || DEFAULT_THEME.accent_color);
    root.style.setProperty('--text-color', theme.text_color || DEFAULT_THEME.text_color);
    root.style.setProperty('--background-color', theme.background_color || DEFAULT_THEME.background_color);

    // Apply animation duration based on setting
    if (theme.animations_enabled === false) {
        root.style.setProperty('--animation-duration', '0s');
        root.style.setProperty('--transition-duration', '0s');
    } else {
        root.style.setProperty('--animation-duration', '0.3s');
        root.style.setProperty('--transition-duration', '0.2s');
    }

    // Apply background
    const body = document.body;
    if (theme.background_image_url) {
        body.style.backgroundImage = `url(${window.API_URL}${theme.background_image_url})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
        body.style.backgroundColor = 'transparent';
    } else {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = theme.background_color || DEFAULT_THEME.background_color;
    }

    // Apply logo if exists
    if (theme.logo_url) {
        const logoElements = document.querySelectorAll('.nav-logo, .store-logo');
        logoElements.forEach(el => {
            el.src = `${window.API_URL}${theme.logo_url}`;
            el.style.display = 'block';
        });
    }

    // Cache the theme in localStorage for faster subsequent loads
    localStorage.setItem('storeTheme', JSON.stringify(theme));
}

/**
 * Adjust color brightness
 */
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Load theme from API
 */
async function loadThemeFromAPI() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const response = await fetch(`${window.API_URL}/api/customization`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.customization;
        }
    } catch (error) {
        console.error('Failed to load theme:', error);
    }
    return null;
}

/**
 * Initialize theme on page load
 */
async function initializeTheme() {
    // First, try to apply cached theme for instant loading
    const cachedTheme = localStorage.getItem('storeTheme');
    if (cachedTheme) {
        try {
            applyTheme(JSON.parse(cachedTheme));
        } catch (e) {
            // Invalid cache, ignore
        }
    }

    // Then fetch fresh theme from API
    const token = localStorage.getItem('token');
    if (token) {
        const freshTheme = await loadThemeFromAPI();
        if (freshTheme) {
            applyTheme(freshTheme);
        }
    }
}

// Export for use in settings page
window.ThemeLoader = {
    applyTheme,
    loadThemeFromAPI,
    initializeTheme,
    DEFAULT_THEME
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
    initializeTheme();
}

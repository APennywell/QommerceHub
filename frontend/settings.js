// API_URL is set by theme-loader.js
const API_URL = window.API_URL || 'http://localhost:5000';

// Theme presets
const THEME_PRESETS = {
    default: {
        primary_color: '#667eea',
        secondary_color: '#764ba2',
        accent_color: '#10b981',
        text_color: '#111827',
        background_color: '#f9fafb'
    },
    ocean: {
        primary_color: '#0077b6',
        secondary_color: '#00b4d8',
        accent_color: '#90e0ef',
        text_color: '#023e8a',
        background_color: '#caf0f8'
    },
    forest: {
        primary_color: '#2d6a4f',
        secondary_color: '#40916c',
        accent_color: '#95d5b2',
        text_color: '#1b4332',
        background_color: '#d8f3dc'
    },
    sunset: {
        primary_color: '#f72585',
        secondary_color: '#7209b7',
        accent_color: '#4361ee',
        text_color: '#240046',
        background_color: '#fff0f5'
    },
    minimal: {
        primary_color: '#212529',
        secondary_color: '#495057',
        accent_color: '#6c757d',
        text_color: '#212529',
        background_color: '#f8f9fa'
    }
};

// Current settings state
let currentSettings = { ...window.ThemeLoader.DEFAULT_THEME };

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load store name
function loadStoreName() {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    document.getElementById('storeName').textContent = tenant.store_name || tenant.name || '';
}

// Handle logout
async function handleLogout() {
    const token = localStorage.getItem('token');
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

// Initialize page
async function init() {
    if (!checkAuth()) return;
    loadStoreName();
    await loadCurrentSettings();
    setupPresetListeners();
}

// Load current customization settings
async function loadCurrentSettings() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/customization`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.customization) {
                currentSettings = { ...window.ThemeLoader.DEFAULT_THEME, ...data.customization };
                applySettingsToForm(currentSettings);
                updatePreview();
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Apply settings to form inputs
function applySettingsToForm(settings) {
    // Colors
    document.getElementById('primaryColor').value = settings.primary_color || '#667eea';
    document.getElementById('secondaryColor').value = settings.secondary_color || '#764ba2';
    document.getElementById('accentColor').value = settings.accent_color || '#10b981';
    document.getElementById('textColor').value = settings.text_color || '#111827';
    document.getElementById('backgroundColor').value = settings.background_color || '#f9fafb';

    // Update color value displays
    document.getElementById('primaryColorValue').textContent = settings.primary_color || '#667eea';
    document.getElementById('secondaryColorValue').textContent = settings.secondary_color || '#764ba2';
    document.getElementById('accentColorValue').textContent = settings.accent_color || '#10b981';
    document.getElementById('textColorValue').textContent = settings.text_color || '#111827';
    document.getElementById('backgroundColorValue').textContent = settings.background_color || '#f9fafb';

    // Animations
    document.getElementById('animationsEnabled').checked = settings.animations_enabled !== false;

    // Logo
    if (settings.logo_url) {
        const logoPreview = document.getElementById('logoPreview');
        logoPreview.src = `${API_URL}${settings.logo_url}`;
        logoPreview.style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
        document.getElementById('logoUploadArea').classList.add('has-file');
        document.getElementById('removeLogoBtn').style.display = 'block';
    }

    // Background
    if (settings.background_image_url) {
        const bgPreview = document.getElementById('bgPreview');
        bgPreview.src = `${API_URL}${settings.background_image_url}`;
        bgPreview.style.display = 'block';
        document.getElementById('bgPlaceholder').style.display = 'none';
        document.getElementById('bgUploadArea').classList.add('has-file');
        document.getElementById('removeBgBtn').style.display = 'block';
    }
}

// Setup preset theme listeners
function setupPresetListeners() {
    document.querySelectorAll('.preset-theme').forEach(el => {
        el.addEventListener('click', () => {
            const themeName = el.dataset.theme;
            const preset = THEME_PRESETS[themeName];
            if (preset) {
                applyPreset(preset);
                // Update active state
                document.querySelectorAll('.preset-theme').forEach(p => p.classList.remove('active'));
                el.classList.add('active');
            }
        });
    });
}

// Apply preset theme
function applyPreset(preset) {
    currentSettings = { ...currentSettings, ...preset };
    applySettingsToForm(currentSettings);
    updatePreview();
}

// Handle color change
function handleColorChange() {
    currentSettings.primary_color = document.getElementById('primaryColor').value;
    currentSettings.secondary_color = document.getElementById('secondaryColor').value;
    currentSettings.accent_color = document.getElementById('accentColor').value;
    currentSettings.text_color = document.getElementById('textColor').value;
    currentSettings.background_color = document.getElementById('backgroundColor').value;

    // Update displays
    document.getElementById('primaryColorValue').textContent = currentSettings.primary_color;
    document.getElementById('secondaryColorValue').textContent = currentSettings.secondary_color;
    document.getElementById('accentColorValue').textContent = currentSettings.accent_color;
    document.getElementById('textColorValue').textContent = currentSettings.text_color;
    document.getElementById('backgroundColorValue').textContent = currentSettings.background_color;

    // Clear preset selection
    document.querySelectorAll('.preset-theme').forEach(p => p.classList.remove('active'));

    updatePreview();
}

// Handle animation toggle
function handleAnimationToggle() {
    currentSettings.animations_enabled = document.getElementById('animationsEnabled').checked;
    updatePreview();
}

// Update live preview
function updatePreview() {
    const previewBox = document.getElementById('previewBox');
    const previewNavbar = document.getElementById('previewNavbar');
    const previewBtn = document.getElementById('previewBtn');

    previewBox.style.backgroundColor = currentSettings.background_color;
    previewNavbar.style.background = `linear-gradient(135deg, ${currentSettings.primary_color}, ${currentSettings.secondary_color})`;
    previewBtn.style.backgroundColor = currentSettings.primary_color;

    // Update accent text
    const accentText = previewBox.querySelector('span[style*="accent"]');
    if (accentText) {
        accentText.style.color = currentSettings.accent_color;
    }

    // Update text color
    const textElements = previewBox.querySelectorAll('p');
    textElements.forEach(el => {
        el.style.color = currentSettings.text_color;
    });

    // Apply animation setting
    if (currentSettings.animations_enabled === false) {
        previewBox.style.transition = 'none';
    } else {
        previewBox.style.transition = 'all 0.3s';
    }
}

// Handle logo upload
async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Logo must be less than 2MB');
        return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/customization/logo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            currentSettings.logo_url = data.logo_url;

            // Update preview
            const logoPreview = document.getElementById('logoPreview');
            logoPreview.src = `${API_URL}${data.logo_url}`;
            logoPreview.style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
            document.getElementById('logoUploadArea').classList.add('has-file');
            document.getElementById('removeLogoBtn').style.display = 'block';
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to upload logo');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload logo');
    }
}

// Handle logo removal
async function handleRemoveLogo() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/customization/logo`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentSettings.logo_url = null;
            document.getElementById('logoPreview').style.display = 'none';
            document.getElementById('logoPlaceholder').style.display = 'block';
            document.getElementById('logoUploadArea').classList.remove('has-file');
            document.getElementById('removeLogoBtn').style.display = 'none';
            document.getElementById('logoInput').value = '';
        }
    } catch (error) {
        console.error('Remove error:', error);
        alert('Failed to remove logo');
    }
}

// Handle background upload
async function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Background image must be less than 10MB');
        return;
    }

    const formData = new FormData();
    formData.append('background', file);

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/customization/background`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            currentSettings.background_image_url = data.background_image_url;

            // Update preview
            const bgPreview = document.getElementById('bgPreview');
            bgPreview.src = `${API_URL}${data.background_image_url}`;
            bgPreview.style.display = 'block';
            document.getElementById('bgPlaceholder').style.display = 'none';
            document.getElementById('bgUploadArea').classList.add('has-file');
            document.getElementById('removeBgBtn').style.display = 'block';
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to upload background');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload background');
    }
}

// Handle background removal
async function handleRemoveBackground() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/customization/background`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentSettings.background_image_url = null;
            document.getElementById('bgPreview').style.display = 'none';
            document.getElementById('bgPlaceholder').style.display = 'block';
            document.getElementById('bgUploadArea').classList.remove('has-file');
            document.getElementById('removeBgBtn').style.display = 'none';
            document.getElementById('bgInput').value = '';
        }
    } catch (error) {
        console.error('Remove error:', error);
        alert('Failed to remove background');
    }
}

// Handle save
async function handleSave() {
    const token = localStorage.getItem('token');

    const settings = {
        primary_color: currentSettings.primary_color,
        secondary_color: currentSettings.secondary_color,
        accent_color: currentSettings.accent_color,
        text_color: currentSettings.text_color,
        background_color: currentSettings.background_color,
        animations_enabled: currentSettings.animations_enabled
    };

    try {
        const response = await fetch(`${API_URL}/api/customization`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            const data = await response.json();
            // Update current settings with response
            currentSettings = { ...currentSettings, ...data.customization };

            // Apply theme globally
            window.ThemeLoader.applyTheme(currentSettings);

            alert('Settings saved successfully!');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save settings');
    }
}

// Handle reset to defaults
function handleReset() {
    if (!confirm('Are you sure you want to reset all colors to defaults?')) return;

    currentSettings = {
        ...currentSettings,
        ...window.ThemeLoader.DEFAULT_THEME
    };

    applySettingsToForm(currentSettings);
    updatePreview();

    // Select default preset
    document.querySelectorAll('.preset-theme').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-theme="default"]').classList.add('active');
}

// Setup all event listeners (CSP-compliant)
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Logo upload
    const logoUploadArea = document.getElementById('logoUploadArea');
    if (logoUploadArea) {
        logoUploadArea.addEventListener('click', () => document.getElementById('logoInput').click());
    }
    const logoInput = document.getElementById('logoInput');
    if (logoInput) {
        logoInput.addEventListener('change', handleLogoUpload);
    }
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', handleRemoveLogo);
    }

    // Background upload
    const bgUploadArea = document.getElementById('bgUploadArea');
    if (bgUploadArea) {
        bgUploadArea.addEventListener('click', () => document.getElementById('bgInput').click());
    }
    const bgInput = document.getElementById('bgInput');
    if (bgInput) {
        bgInput.addEventListener('change', handleBackgroundUpload);
    }
    const removeBgBtn = document.getElementById('removeBgBtn');
    if (removeBgBtn) {
        removeBgBtn.addEventListener('click', handleRemoveBackground);
    }

    // Color pickers
    const colorInputs = ['primaryColor', 'secondaryColor', 'accentColor', 'textColor', 'backgroundColor'];
    colorInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', handleColorChange);
            input.addEventListener('input', handleColorChange);
        }
    });

    // Animations toggle
    const animationsEnabled = document.getElementById('animationsEnabled');
    if (animationsEnabled) {
        animationsEnabled.addEventListener('change', handleAnimationToggle);
    }

    // Save and Reset buttons
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    init();
});

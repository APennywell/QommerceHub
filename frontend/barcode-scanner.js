// API_URL is set by theme-loader.js (base URL without /api)
const BASE_URL = window.API_URL || 'http://localhost:5001';
const API_URL = BASE_URL + '/api';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// Load store name
async function loadStoreName() {
    const token = checkAuth();
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/tenants/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('storeName').textContent = data.store_name;
        }
    } catch (error) {
        console.error('Error loading store name:', error);
    }
}

// handleLogout is now in utils.js

// Initialize Quagga scanner
let scannerActive = false;

function startScanner() {
    if (scannerActive) return;

    document.getElementById('scannerContainer').style.display = 'block';
    document.getElementById('scanBtn').disabled = true;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ],
            debug: {
                drawBoundingBox: true,
                showFrequency: true,
                drawScanline: true,
                showPattern: true
            }
        },
        locate: true,
        locator: {
            halfSample: true,
            patchSize: "medium"
        },
        frequency: 10,
    }, function(err) {
        if (err) {
            console.error('Error initializing Quagga:', err);
            alert('Unable to access camera. Please check permissions.');
            stopScanner();
            return;
        }
        console.log("Quagga initialization finished. Ready to start");
        Quagga.start();
        scannerActive = true;
    });

    Quagga.onDetected(onBarcodeDetected);
}

function stopScanner() {
    if (!scannerActive) return;

    Quagga.stop();
    scannerActive = false;
    document.getElementById('scannerContainer').style.display = 'none';
    document.getElementById('scanBtn').disabled = false;
}

// Barcode detection handler
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 2000; // 2 seconds cooldown between same barcode scans

function onBarcodeDetected(result) {
    const code = result.codeResult.code;
    const currentTime = Date.now();

    // Prevent duplicate scans
    if (code === lastScannedCode && (currentTime - lastScanTime) < SCAN_COOLDOWN) {
        return;
    }

    lastScannedCode = code;
    lastScanTime = currentTime;

    console.log('Barcode detected:', code);

    // Play beep sound (optional - you can add an audio element)
    playBeep();

    // Stop scanner temporarily
    stopScanner();

    // Lookup product
    lookupBarcodeValue(code);
}

function playBeep() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Manual barcode lookup
function lookupBarcode() {
    const barcodeInput = document.getElementById('barcodeInput');
    const code = barcodeInput.value.trim();

    if (!code) {
        alert('Please enter a barcode or SKU');
        return;
    }

    lookupBarcodeValue(code);
    barcodeInput.value = '';
}

// Lookup barcode in inventory
async function lookupBarcodeValue(code) {
    const token = checkAuth();
    if (!token) return;

    try {
        // Search inventory by SKU
        const response = await fetch(`${API_URL}/inventory?search=${encodeURIComponent(code)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to search inventory');
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const product = data.items[0];
            displayProduct(product, code);
            addToHistory(code, product);
        } else {
            displayNotFound(code);
            addToHistory(code, null);
        }
    } catch (error) {
        console.error('Error looking up barcode:', error);
        alert('Error looking up product. Please try again.');
    }
}

// Display product information
function displayProduct(product, barcode) {
    const resultsDiv = document.getElementById('results');
    const productInfoDiv = document.getElementById('productInfo');

    const stockStatus = product.quantity === 0 ?
        '<span style="color: var(--danger); font-weight: bold;">OUT OF STOCK</span>' :
        product.quantity <= 10 ?
            '<span style="color: var(--warning); font-weight: bold;">LOW STOCK</span>' :
            '<span style="color: var(--success); font-weight: bold;">IN STOCK</span>';

    productInfoDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 15px; align-items: start;">
            ${product.image_url ? `
                <img src="${BASE_URL}${product.image_url}" alt="${product.name}"
                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid var(--gray-200);">
            ` : `
                <div style="width: 150px; height: 150px; background: var(--gray-200); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--gray-500);">
                    No Image
                </div>
            `}
            <div>
                <h3 style="margin: 0 0 10px 0; color: var(--primary);">${product.name}</h3>
                <p style="margin: 5px 0;"><strong>SKU:</strong> ${product.sku}</p>
                <p style="margin: 5px 0;"><strong>Barcode:</strong> ${barcode}</p>
                <p style="margin: 5px 0;"><strong>Price:</strong> $${parseFloat(product.price).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Quantity:</strong> ${product.quantity} ${stockStatus}</p>
                <p style="margin: 5px 0;"><strong>Category:</strong> ${product.category || 'N/A'}</p>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-success" data-action="start-scanner">Scan Another</button>
                    <button class="btn" style="background: var(--info); color: white;" data-action="go-to-inventory">
                        View in Inventory
                    </button>
                </div>
            </div>
        </div>
    `;

    resultsDiv.style.display = 'block';
}

// Display not found message
function displayNotFound(barcode) {
    const resultsDiv = document.getElementById('results');
    const productInfoDiv = document.getElementById('productInfo');

    productInfoDiv.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
            <h3 style="color: var(--danger); margin-bottom: 10px;">Product Not Found</h3>
            <p style="color: var(--gray-600); margin-bottom: 20px;">
                No product found with barcode/SKU: <strong>${barcode}</strong>
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn btn-success" data-action="start-scanner">Scan Another</button>
                <button class="btn" style="background: var(--primary); color: white;" data-action="go-to-inventory">
                    Add to Inventory
                </button>
            </div>
        </div>
    `;

    resultsDiv.style.display = 'block';
}

// Scan history management
function addToHistory(barcode, product) {
    const history = getScanHistory();

    const historyItem = {
        barcode: barcode,
        timestamp: new Date().toISOString(),
        product: product ? {
            name: product.name,
            sku: product.sku,
            price: product.price
        } : null
    };

    history.unshift(historyItem);

    // Keep only last 20 scans
    if (history.length > 20) {
        history.pop();
    }

    localStorage.setItem('scanHistory', JSON.stringify(history));
    displayHistory();
}

function getScanHistory() {
    const history = localStorage.getItem('scanHistory');
    return history ? JSON.parse(history) : [];
}

function displayHistory() {
    const history = getScanHistory();
    const historySection = document.getElementById('historySection');
    const historyDiv = document.getElementById('scanHistory');

    if (history.length === 0) {
        historySection.style.display = 'none';
        return;
    }

    historySection.style.display = 'block';

    historyDiv.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();

        return `
            <div style="background: var(--gray-50); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${item.product ? 'var(--success)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 5px 0; font-weight: 600; color: var(--gray-800);">
                            ${item.product ? item.product.name : 'Not Found'}
                        </p>
                        <p style="margin: 0; font-size: 14px; color: var(--gray-600);">
                            <strong>Barcode:</strong> ${item.barcode}
                            ${item.product ? ` | <strong>SKU:</strong> ${item.product.sku} | <strong>Price:</strong> $${parseFloat(item.product.price).toFixed(2)}` : ''}
                        </p>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: var(--gray-500);">
                        ${timeStr}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function exportHistory() {
    const history = getScanHistory();

    if (history.length === 0) {
        alert('No scan history to export');
        return;
    }

    // Create CSV content
    let csv = 'Timestamp,Barcode,Product Name,SKU,Price,Status\n';

    history.forEach(item => {
        const timestamp = new Date(item.timestamp).toLocaleString();
        const barcode = item.barcode;
        const name = item.product ? item.product.name : 'Not Found';
        const sku = item.product ? item.product.sku : '-';
        const price = item.product ? `$${parseFloat(item.product.price).toFixed(2)}` : '-';
        const status = item.product ? 'Found' : 'Not Found';

        csv += `"${timestamp}","${barcode}","${name}","${sku}","${price}","${status}"\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('Scan history exported successfully!');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadStoreName();
    displayHistory();

    // Logout button event listener (CSP-compliant)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Static element listeners (migrated from inline handlers)
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', startScanner);
    }

    const stopScannerBtn = document.getElementById('stopScannerBtn');
    if (stopScannerBtn) {
        stopScannerBtn.addEventListener('click', stopScanner);
    }

    const lookupBtn = document.getElementById('lookupBtn');
    if (lookupBtn) {
        lookupBtn.addEventListener('click', lookupBarcode);
    }

    const goToInventoryBtn = document.getElementById('goToInventoryBtn');
    if (goToInventoryBtn) {
        goToInventoryBtn.addEventListener('click', function() {
            window.location.href = 'dashboard.html';
        });
    }

    const goToOrdersBtn = document.getElementById('goToOrdersBtn');
    if (goToOrdersBtn) {
        goToOrdersBtn.addEventListener('click', function() {
            window.location.href = 'orders.html';
        });
    }

    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', exportHistory);
    }

    // Event delegation for dynamically generated buttons in results area
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            if (action === 'start-scanner') startScanner();
            if (action === 'go-to-inventory') window.location.href = 'dashboard.html';
        });
    }

    // Allow Enter key in manual input
    document.getElementById('barcodeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            lookupBarcode();
        }
    });
});

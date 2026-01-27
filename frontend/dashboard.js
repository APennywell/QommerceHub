// API_URL is set by theme-loader.js (use window.API_URL to avoid redeclaration)
const API_URL = window.API_URL || 'http://localhost:5000';
let currentPage = 1;
let searchQuery = '';
let isEditing = false;

// Check authentication (uses shared utils.js)
const { token, tenant } = requireAuth();

// Display store name
document.getElementById('storeName').textContent = tenant.store_name || '';

// Load Inventory (handleLogout and apiRequest are now in utils.js)
async function loadInventory(page = 1, search = '') {
    try {
        const params = new URLSearchParams({
            page,
            limit: 10,
            search,
            sortBy: 'created_at',
            sortOrder: 'DESC'
        });

        const response = await apiRequest(`/api/inventory?${params}`);

        if (!response) {
            // Session expired or unauthorized
            return;
        }

        const data = await response.json();

        if (data.items) {
            renderInventoryTable(data.items);
            renderPagination(data.pagination);
            updateStats(data.items, data.pagination.total);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        const errorMessage = error.message.includes('Failed to fetch')
            ? 'Cannot connect to server. Please check your internet connection.'
            : 'Failed to load inventory. Please refresh the page.';
        document.getElementById('inventoryTable').innerHTML =
            `<div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>${errorMessage}</p>
                <button class="btn btn-primary" onclick="loadInventory()">Try Again</button>
            </div>`;
    }
}

// Render Inventory Table
function renderInventoryTable(items) {
    const tableContainer = document.getElementById('inventoryTable');

    if (items.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>No products found</p>
                <button class="btn btn-success" onclick="openAddModal()">Add Your First Product</button>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const status = item.quantity === 0 ? 'Out of Stock' :
                      item.quantity < 10 ? 'Low Stock' : 'In Stock';
        const statusClass = item.quantity === 0 ? 'danger' :
                           item.quantity < 10 ? 'warning' : 'success';

        const imageHtml = item.image_url ?
            `<img src="${API_URL}${item.image_url}" alt="${escapeHtml(item.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">` :
            `<div style="width: 50px; height: 50px; background: var(--gray-200); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 20px;">📦</div>`;

        html += `
            <tr>
                <td>${imageHtml}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.sku)}</td>
                <td>${item.quantity}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td><span class="badge badge-${statusClass}">${status}</span></td>
                <td>
                    <button class="btn" style="background: var(--primary); color: white; padding: 6px 12px; margin-right: 5px;"
                            onclick="editProduct(${item.id})">Edit</button>
                    <button class="btn" style="background: var(--danger); color: white; padding: 6px 12px;"
                            onclick="deleteProduct(${item.id}, event)">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = html;
}

// Render Pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${totalPages}</span>
        <button onclick="changePage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
    `;

    container.innerHTML = html;
}

// Update Stats
function updateStats(items, total) {
    document.getElementById('totalProducts').textContent = total;

    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;

    const lowStock = items.filter(item => item.quantity < 10 && item.quantity > 0).length;
    document.getElementById('lowStock').textContent = lowStock;

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('totalQuantity').textContent = totalQuantity;
}

// Change Page
function changePage(page) {
    currentPage = page;
    loadInventory(page, searchQuery);
}

// Handle Search
let searchTimeout;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = document.getElementById('searchInput').value;
        currentPage = 1;
        loadInventory(1, searchQuery);
    }, 300);
}

// Open Add Modal
function openAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Edit Product
async function editProduct(id) {
    try {
        const response = await apiRequest(`/api/inventory?search=&page=1&limit=100`);
        if (!response) return;
        const data = await response.json();
        const product = data.items.find(item => item.id === id);

        if (product) {
            isEditing = true;
            document.getElementById('modalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productSku').value = product.sku;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productModal').classList.add('active');
        }
    } catch (error) {
        alert('Error loading product details');
    }
}

// Handle Product Submit
async function handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSku').value,
        quantity: parseInt(document.getElementById('productQuantity').value),
        price: parseFloat(document.getElementById('productPrice').value)
    };

    const productId = document.getElementById('productId').value;
    const imageFile = document.getElementById('productImage').files[0];

    // Get button and show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        let response;
        let savedProductId = productId;

        // Step 1: Save product data
        if (isEditing && productId) {
            response = await apiRequest(`/api/inventory/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            response = await apiRequest('/api/inventory', {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                savedProductId = result.item.id;
            }
        }

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Failed to save product');
            // Restore button on error
            button.disabled = false;
            button.innerHTML = originalText;
            return;
        }

        // Step 2: Upload image if provided
        if (imageFile && savedProductId) {
            button.innerHTML = '<span class="spinner"></span> Uploading image...';
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch(`${API_URL}/api/inventory/${savedProductId}/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                console.error('Image upload failed, but product was saved');
            }
        }

        closeModal();
        loadInventory(currentPage, searchQuery);
        alert(isEditing ? 'Product updated successfully!' : 'Product added successfully!');
        // Restore button for next use
        button.disabled = false;
        button.innerHTML = originalText;
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product');
        // Restore button on error
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Delete Product
async function deleteProduct(id, e) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    // Get the delete button that was clicked (passed from onclick event)
    const button = e ? e.target.closest('button') : null;
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span>';
    }

    try {
        const response = await apiRequest(`/api/inventory/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadInventory(currentPage, searchQuery);
            alert('Product deleted successfully!');
        } else {
            alert('Failed to delete product');
            // Restore button on error
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
    } catch (error) {
        alert('Error deleting product');
        // Restore button on error
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

// Image handling functions (escapeHtml is now in utils.js)
function previewImage() {
    const file = document.getElementById('productImage').files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            document.getElementById('productImage').value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
}

// Setup event listeners (CSP-compliant)
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Check for first login onboarding
    checkOnboarding();
});

// Onboarding checklist for first-time users
async function checkOnboarding() {
    // Check if this is first login
    if (tenant.firstLogin) {
        showOnboardingModal();
    }
}

function showOnboardingModal() {
    // Create onboarding modal if it doesn't exist
    if (!document.getElementById('onboardingModal')) {
        const modalHtml = `
            <div id="onboardingModal" class="modal active">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 style="color: var(--primary);">Welcome to QommerceHub!</h2>
                        <button class="modal-close" onclick="closeOnboarding()">&times;</button>
                    </div>
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 4em; margin-bottom: 10px;">🎉</div>
                        <p style="color: var(--gray-600); font-size: 1.1em;">
                            Your store <strong>${escapeHtml(tenant.store_name)}</strong> is ready!
                        </p>
                    </div>
                    <div style="background: var(--gray-50); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 15px; color: var(--gray-700);">Quick Start Checklist</h3>
                        <div class="onboarding-checklist">
                            <label class="checklist-item">
                                <input type="checkbox" id="checkProducts" onchange="updateChecklist()">
                                <span>Add your first products</span>
                            </label>
                            <label class="checklist-item">
                                <input type="checkbox" id="checkCustomers" onchange="updateChecklist()">
                                <span>Add your first customer</span>
                            </label>
                            <label class="checklist-item">
                                <input type="checkbox" id="checkSettings" onchange="updateChecklist()">
                                <span>Customize your store</span>
                            </label>
                            <label class="checklist-item">
                                <input type="checkbox" id="checkAnalytics" onchange="updateChecklist()">
                                <span>View analytics dashboard</span>
                            </label>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-success" onclick="startWithProducts()" style="flex: 1;">
                            Add Products
                        </button>
                        <button class="btn" onclick="closeOnboarding()" style="flex: 1; background: var(--gray-200); color: var(--gray-700);">
                            Explore First
                        </button>
                    </div>
                </div>
            </div>
            <style>
                .onboarding-checklist {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .checklist-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 15px;
                    background: white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 2px solid transparent;
                }
                .checklist-item:hover {
                    border-color: var(--primary);
                }
                .checklist-item input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    accent-color: var(--primary);
                }
                .checklist-item input:checked + span {
                    text-decoration: line-through;
                    color: var(--gray-500);
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        document.getElementById('onboardingModal').classList.add('active');
    }
}

function closeOnboarding() {
    document.getElementById('onboardingModal').classList.remove('active');
    completeOnboarding();
}

function startWithProducts() {
    closeOnboarding();
    openAddModal();
}

function updateChecklist() {
    // Track progress locally
    const checks = [
        document.getElementById('checkProducts').checked,
        document.getElementById('checkCustomers').checked,
        document.getElementById('checkSettings').checked,
        document.getElementById('checkAnalytics').checked
    ];

    const completed = checks.filter(c => c).length;
    if (completed === 4) {
        setTimeout(() => {
            closeOnboarding();
            alert('Great job! You\'ve completed the getting started checklist!');
        }, 500);
    }
}

async function completeOnboarding() {
    try {
        await apiRequest('/api/tenants/complete-onboarding', {
            method: 'POST'
        });
        // Update local tenant data
        tenant.firstLogin = false;
        const authData = JSON.parse(localStorage.getItem('auth') || '{}');
        if (authData.tenant) {
            authData.tenant.firstLogin = false;
            localStorage.setItem('auth', JSON.stringify(authData));
        }
    } catch (err) {
        console.error('Failed to complete onboarding:', err);
    }
}

// Initial load
loadInventory();
